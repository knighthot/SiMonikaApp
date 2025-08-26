// ChatAi.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listChatSessions,
  createChatSession,
  sendChatMessage,
  getChatMessages,
  deleteChatSession
} from '../../../api';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

/* ---------- MarkdownText: inline markdown sederhana ---------- */
const MarkdownText = ({
  text,
  baseStyle = { fontSize: 16, lineHeight: 22, color: '#1B3551' },
  boldStyle = { fontWeight: '700' },
  italicStyle = { fontStyle: 'italic' },
  codeStyle = {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  linkStyle = { textDecorationLine: 'underline' },
  onPressLink,
}) => {
  const tokens = [];
  const src = text || '';
  let i = 0;

  while (i < src.length) {
    const next = src.slice(i).match(/(\*\*|\*|`|\[|\n)/);
    if (!next) { tokens.push({ type: 'text', value: src.slice(i) }); break; }
    const idx = i + next.index;
    if (idx > i) tokens.push({ type: 'text', value: src.slice(i, idx) });
    i = idx;

    if (src[i] === '\n') { tokens.push({ type: 'newline' }); i += 1; continue; }

    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2);
      if (end !== -1) { tokens.push({ type: 'bold', value: src.slice(i + 2, end) }); i = end + 2; continue; }
    }

    if (src[i] === '*') {
      const end = src.indexOf('*', i + 1);
      if (end !== -1) { tokens.push({ type: 'italic', value: src.slice(i + 1, end) }); i = end + 1; continue; }
    }

    if (src[i] === '`') {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) { tokens.push({ type: 'code', value: src.slice(i + 1, end) }); i = end + 1; continue; }
    }

    if (src[i] === '[') {
      const endLabel = src.indexOf(']', i + 1);
      if (endLabel !== -1 && src[endLabel + 1] === '(') {
        const endUrl = src.indexOf(')', endLabel + 2);
        if (endUrl !== -1) {
          tokens.push({ type: 'link', label: src.slice(i + 1, endLabel), href: src.slice(endLabel + 2, endUrl) });
          i = endUrl + 1; continue;
        }
      }
    }

    tokens.push({ type: 'text', value: src[i] });
    i += 1;
  }

  return (
    <Text style={baseStyle}>
      {tokens.map((t, idx) => {
        switch (t.type) {
          case 'text': return <Text key={idx}>{t.value}</Text>;
          case 'newline': return <Text key={idx}>{'\n'}</Text>;
          case 'bold': return <Text key={idx} style={boldStyle}>{t.value}</Text>;
          case 'italic': return <Text key={idx} style={italicStyle}>{t.value}</Text>;
          case 'code': return <Text key={idx} style={codeStyle}>{t.value}</Text>;
          case 'link': return <Text key={idx} style={linkStyle} onPress={() => onPressLink?.(t.href)}>{t.label}</Text>;
          default: return null;
        }
      })}
    </Text>
  );
};

const AUTOSEND_TTL = 5 * 60 * 1000; // 5 menit

const makeAutoKey = (sid, p) => `autosent:${sid}:${hash32(String(p || ''))}`;

async function isAutosentRecently(key) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return false;
  try {
    const { status, ts } = JSON.parse(raw);
    if (ts && (Date.now() - ts) < AUTOSEND_TTL) return true;
  } catch {}
  // expired atau format lama -> bersihkan supaya bisa kirim lagi
  await AsyncStorage.removeItem(key);
  return false;
}

async function markAutosent(key, status) {
  // status: 'P' (pending) atau 'D' (done)
  const payload = JSON.stringify({ status, ts: Date.now() });
  await AsyncStorage.setItem(key, payload);
}


/* ---------- Normalisasi sesi dari API ---------- */
const normSession = (r) => ({
  ID_ChatSession: r?.ID_ChatSession ?? r?.id ?? r?.session_id ?? r?.uuid,
  Title: r?.Title ?? r?.title ?? 'Tanpa Judul',
});

/* ---------- Hash kecil untuk dedupe auto-send ---------- */
const hash32 = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return String(h >>> 0);
};

/* ============================ Component ============================ */
const ChatAi = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Sessions
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);  // [{ID_ChatSession, Title}]
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingSess, setLoadingSess] = useState(true);

  // Chat
  const [messages, setMessages] = useState([]); // [{id, role, content, createdAt}]
  const [initialLoaded, setInitialLoaded] = useState(false); // fetch messages done

  // Input/send & typing effect
  const [text, setText] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false); // HTTP request in-flight
  const [typing, setTyping] = useState(false);                 // typing animation running
  const isActive = sendingRequest || typing;                   // for Stop button state
  const [isStopping, setIsStopping] = useState(false);
  const sendingCtrlRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingStateRef = useRef({ tempId: null, full: '', shownLen: 0 });

  // Auto send from Dashboard
  const initialPromptRef = useRef(null);
  const autoSendRef = useRef(false);
  const preferNewSessionRef = useRef(false);

  const [pendingAuto, setPendingAuto] = useState(false);

// setiap param berubah, tandai pending
useEffect(() => {
  const p = route?.params;
  if (p?.initialPrompt && p?.autoSend) {
    initialPromptRef.current = String(p.initialPrompt);
    autoSendRef.current = true; // opsional, supaya konsisten
    setPendingAuto(true);
  }
}, [route?.params]);



  // Back
  const handleBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate?.('DashboardUser');
  };

  // refs
 const listRef = useRef(null);
const firstAutoScrollDone = useRef(false);

const scrollToEnd = (animated = true) =>
  requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated }));

  /* ---------- Load session list on focus ---------- */
  useFocusEffect(
    React.useCallback(() => {
      let on = true;
      (async () => {
        try {
          setLoadingSess(true);
          const rows = await listChatSessions(); // needs token
          if (!on) return;
          const normRows = (rows || []).map(normSession);
          setSessions(normRows);

          const last = await AsyncStorage.getItem('chat_last_session_id');

          if (preferNewSessionRef.current || !normRows?.length) {
            const s = await createChatSession('Analisis Tambak');
            const newRow = normSession({ id: s?.id, title: s?.title || 'Analisis Tambak' });
            setSessions(prev => [newRow, ...(prev || [])]);
            setSessionId(newRow.ID_ChatSession);
          } else {
            const found = normRows.find(r => r.ID_ChatSession === last) || normRows[0];
            setSessionId(found?.ID_ChatSession || null);
            if (!found) setPickerOpen(true);
          }
        } catch (e) {
          Alert.alert('Sesi gagal dimuat', e.message);
          setSessionId(null);
          setPickerOpen(true);
        } finally {
          setLoadingSess(false);
        }
      })();
      return () => { on = false; };
    }, [])
  );

  // Persist last session id
  useEffect(() => {
    if (sessionId) AsyncStorage.setItem('chat_last_session_id', String(sessionId)).catch(() => {});
  }, [sessionId]);

  /* ---------- Load messages for a session (merge; avoid wiping placeholder) ---------- */
  useEffect(() => {
    let on = true;
    (async () => {
      if (!sessionId) { setMessages([]); setInitialLoaded(true); return; }

      setInitialLoaded(false);
      try {
        const rows = await getChatMessages(sessionId, { limit: 50, order: 'ASC' });
        if (!on) return;
        const mapped = (rows || []).map(m => ({
          id: m.id, role: m.role, content: m.content, createdAt: m.createdAt
        }));

        setMessages(prev => {
          const byId = new Map(prev.map(m => [m.id, m]));
          for (const m of mapped) byId.set(m.id, m);
          const merged = Array.from(byId.values());
          merged.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
          return merged;
        });
      } catch (e) {
        if (!on) return;
        console.log('getChatMessages error', e.message);
      } finally {
        if (on) setInitialLoaded(true);
      }
    })();

    return () => { on = false; };
  }, [sessionId]);

  useEffect(() => {
  if (!initialLoaded) return;
  // Baru masuk / ganti sesi → scroll ke bawah TANPA animasi
  scrollToEnd(false);
  firstAutoScrollDone.current = true;
}, [initialLoaded]);


  /* ---------- Auto-send initial prompt AFTER messages loaded (DEDUPE) ---------- */
 useEffect(() => {
  (async () => {
    if (!pendingAuto || !sessionId || !initialLoaded) return;

    const prompt = (initialPromptRef.current || '').trim();
    if (!prompt) { setPendingAuto(false); return; }

    const key = makeAutoKey(sessionId, prompt);
    if (await isAutosentRecently(key)) {
      // sudah pernah auto-send baru-baru ini → jangan ulangi
      navigation.setParams?.({ initialPrompt: undefined, autoSend: false });
      setPendingAuto(false);
      return;
    }

    await markAutosent(key, 'P');
    try {
      setText(prompt);
      await onSendExplicit(prompt);
      await markAutosent(key, 'D');
    } catch {
      // kalau gagal total, biar bisa dicoba lagi
      await AsyncStorage.removeItem(key);
    } finally {
      navigation.setParams?.({ initialPrompt: undefined, autoSend: false });
      setPendingAuto(false);
    }
  })();
}, [pendingAuto, sessionId, initialLoaded]); // <- perhatikan dependency

  /* ---------- Typing effect helpers ---------- */
  const clearTypingTimer = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const startTyping = (tempId, fullText) => {
    clearTypingTimer();
    setTyping(true);
    typingStateRef.current = { tempId, full: fullText, shownLen: 0 };

    const TICK_MS = 18;
    const STEP = 2;

    typingTimerRef.current = setInterval(() => {
      const st = typingStateRef.current;
      if (!st) return;
      const nextLen = Math.min(st.full.length, st.shownLen + STEP);
      typingStateRef.current = { ...st, shownLen: nextLen };

      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, content: st.full.slice(0, nextLen) } : m))
      );

      if (nextLen >= st.full.length) {
        clearTypingTimer();
        setTyping(false);
      }
    }, TICK_MS);
  };

  useEffect(() => () => clearTypingTimer(), []);

  /* ---------- Send helpers ---------- */
  async function onSend() {
    const prompt = text.trim();
    if (!prompt || !sessionId || isActive) return;
    await onSendExplicit(prompt);
  }

  async function onSendExplicit(promptRaw) {
    const prompt = String(promptRaw || '').trim();
    if (!prompt || !sessionId || isActive) return;

    setText('');
    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: prompt, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    scrollToEnd();

    setSendingRequest(true);
    setIsStopping(false);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'assistant', content: '…', createdAt: new Date().toISOString() }]);

    sendingCtrlRef.current = new AbortController();

    try {
      const resp = await sendChatMessage(
        sessionId,
        prompt,
        'gpt-3.5-turbo-0125',
        { signal: sendingCtrlRef.current.signal }
      );

      const answer = resp?.answer ?? resp?.content ?? '';
      setSendingRequest(false);

      // Mulai typing effect
      startTyping(tempId, answer || '(kosong)');
      scrollToEnd();
    } catch (e) {
      setSendingRequest(false);
      if (e.name === 'AbortError') {
        // Stop ditekan saat request → hapus placeholder
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } else {
        Alert.alert('Gagal mengirim', e.message);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } finally {
      sendingCtrlRef.current = null;
    }
  }

  function onStop() {
    setIsStopping(true);
    // 1) Hentikan request HTTP jika masih jalan
    if (sendingRequest && sendingCtrlRef.current) {
      try { sendingCtrlRef.current.abort(); } catch {}
      setSendingRequest(false);
      setIsStopping(false);
      return;
    }
    // 2) Hentikan typing effect → tampilkan jawaban penuh
    if (typing) {
      const { tempId, full } = typingStateRef.current || {};
      clearTypingTimer();
      if (tempId && typeof full === 'string') {
        setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, content: full } : m)));
      }
      setTyping(false);
      setIsStopping(false);
    }
  }

  /* ---------- Session ops ---------- */
  async function onCreateSession() {
    try {
      const s = await createChatSession('Percakapan Baru');
      if (!s?.id) throw new Error('Sesi tidak terbentuk');
      const newRow = normSession({ id: s.id, title: s.title || 'Percakapan Baru' });
      setSessions(prev => [newRow, ...prev]);
      setSessionId(newRow.ID_ChatSession);
      setMessages([]);
      setPickerOpen(false);
    } catch (e) { Alert.alert('Gagal buat sesi', e.message); }
  }

  function onSelectSession(id) {
    setSessionId(id);
    setMessages([]);
    setPickerOpen(false);
  }

  async function onDeleteSession(id) {
    Alert.alert('Hapus sesi', 'Yakin ingin menghapus sesi ini beserta semua pesannya?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            await deleteChatSession(id);
            setSessions(prev => prev.filter(s => (s.ID_ChatSession || s.id) !== id));
            if (sessionId === id) { setSessionId(null); setMessages([]); }
          } catch (e) { Alert.alert('Gagal hapus', e.message); }
        }
      }
    ]);
  }

  /* ---------- UI ---------- */
  const renderItem = ({ item }) => {
    const mine = item.role === 'user';
    const bubbleColor = mine ? '#EFF0F3' : '#4F72A8';
    const textColor = mine ? '#1B3551' : '#fff';
    const align = mine ? 'flex-end' : 'flex-start';
    const radius = mine
      ? { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 8 }
      : { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 8, borderBottomRightRadius: 16 };

    return (
      <View style={{ paddingHorizontal: 20, marginVertical: 6, alignItems: align }}>
        <View style={{ maxWidth: '78%', backgroundColor: bubbleColor, paddingVertical: 14, paddingHorizontal: 16, ...radius }}>
          <MarkdownText
            text={item.content}
            baseStyle={{ color: textColor, fontSize: 16, lineHeight: 22 }}
            boldStyle={{ fontWeight: '800', color: textColor }}
            italicStyle={{ fontStyle: 'italic', color: textColor }}
            codeStyle={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              backgroundColor: mine ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
              color: textColor, paddingHorizontal: 4, borderRadius: 4,
            }}
            linkStyle={{ textDecorationLine: 'underline', color: mine ? '#1B5EAA' : '#DDEBFF' }}
            onPressLink={(href) => Alert.alert('Link', href)}
          />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
     
    >
      {/* Header: back */}
      <View style={{ width: 200, marginRight: 8, paddingTop: 30, paddingBottom: 2 }}>
        <TouchableOpacity onPress={handleBack} style={{ padding: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="chevron-left" size={24} color="#1B3551" />
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1B3551' }}>Kembali</Text>
        </TouchableOpacity>
      </View>

      {/* Title & toolbar */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, marginRight: 8 }}>
          <TouchableOpacity onPress={() => setPickerOpen(true)} style={{ padding: 6, alignSelf: 'flex-start', marginTop: 4 }}>
            <Icon name="menu" size={22} color="#1B3551" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1B3551' }}>Pawang Air-AI</Text>

        <View style={{ marginLeft: 'auto', flexDirection: 'row' }}>
          <TouchableOpacity onPress={onCreateSession} style={{ padding: 8 }}>
            <Icon name="plus" size={22} color="#1B3551" />
          </TouchableOpacity>
          {sessionId ? (
            <TouchableOpacity onPress={() => onDeleteSession(sessionId)} style={{ padding: 8, marginLeft: 4 }}>
              <Icon name="trash-2" size={20} color="#B83434" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Chat list (tanpa padding bawah besar — biar ditimpa input) */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    onContentSizeChange={() => scrollToEnd(firstAutoScrollDone.current)}
onLayout={() => scrollToEnd(firstAutoScrollDone.current)}

        ListEmptyComponent={
          !loadingSess && (
            <View style={{ padding: 24 }}>
              <Text style={{ color: '#6B7280' }}>
                {sessionId ? 'Mulai percakapan dengan mengetik pesan di bawah.' : 'Belum ada sesi. Ketuk tombol + untuk membuat sesi baru.'}
              </Text>
            </View>
          )
        }
      />

      {/* Input bar: overlay di atas bubble (menimpa) */}
      <View
        style={{
          
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          zIndex: 100,
          elevation: 20,
          backgroundColor: 'transparent',
        }}
        pointerEvents="box-none"
      >
        <View style={{ backgroundColor: '#4F72A8', borderRadius: 18, padding: 14 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', height: 46 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={sessionId ? 'Send a message.' : 'Pilih / buat sesi dulu'}
              placeholderTextColor="#AAB2BF"
              style={{ flex: 1, color: '#1B3551', fontSize: 16 }}
              onSubmitEditing={onSend}
              editable={!isActive && !!sessionId}
            />
            <TouchableOpacity
              onPress={isActive ? onStop : onSend}
              disabled={!isActive && (!text.trim() || !sessionId)}
              style={{ paddingLeft: 10 }}
            >
              {isActive ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="x-octagon" size={20} color="#B83434" />
                  <Text style={{ color: '#B83434', fontWeight: '700', marginLeft: 6 }}>
                    {isStopping ? 'Stopping…' : 'Stop'}
                  </Text>
                </View>
              ) : (
                <Icon name="send" size={20} color={text.trim() && sessionId ? '#4F72A8' : '#C7CED9'} />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#E8ECF3' }}>
              {sessionId ? `Session: ${String(sessionId).slice(0, 8)}…` : 'no session'}
            </Text>
            {sendingRequest ? (
              <Text style={{ color: '#E8ECF3' }}>mengirim…</Text>
            ) : typing ? (
              <Text style={{ color: '#E8ECF3' }}>AI mengetik…</Text>
            ) : (
              loadingSess ? <Text style={{ color: '#E8ECF3' }}>memuat sesi…</Text> : <View />
            )}
          </View>
        </View>
      </View>

      {/* Session Picker */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.2)', justifyContent: 'flex-start' }}>
          <View style={{ marginTop: 60, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 12, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Icon name="message-circle" size={18} color="#1B3551" />
              <Text style={{ fontWeight: '700', marginLeft: 8, color: '#1B3551' }}>Pilih Sesi</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ marginLeft: 'auto', padding: 6 }}>
                <Icon name="x" size={20} color="#1B3551" />
              </TouchableOpacity>
            </View>

            {sessions?.length ? (
              <FlatList
                data={sessions}
                keyExtractor={(it) => String(it.ID_ChatSession || it.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => onSelectSession(item.ID_ChatSession || item.id)}
                    style={{
                      paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8,
                      backgroundColor: (item.ID_ChatSession || item.id) === sessionId ? '#EEF2FF' : 'transparent'
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: '#1B3551' }}>
                      {item.Title || 'Tanpa Judul'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ color: '#6B7280', fontSize: 12, marginRight: 8 }}>
                        {String(item.ID_ChatSession || item.id).slice(0, 8)}…
                      </Text>
                      <TouchableOpacity onPress={() => onDeleteSession(item.ID_ChatSession || item.id)} style={{ padding: 6, marginLeft: 'auto' }}>
                        <Icon name="trash-2" size={16} color="#B83434" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            ) : (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ color: '#6B7280' }}>Belum ada sesi.</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={onCreateSession}
              style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#4F72A8', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>+ Buat Sesi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default ChatAi;
