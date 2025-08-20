import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listChatSessions, createChatSession, sendChatMessage, getChatMessages, deleteChatSession } from '../../../api';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';


const ChatAi = () => {
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);   // [{id,title,...}]
  const [pickerOpen, setPickerOpen] = useState(false);
 const sendingCtrlRef = useRef(null);      // 🆕 AbortController untuk Stop
 const [isStopping, setIsStopping] = useState(false); // 🆕 visual state
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSess, setLoadingSess] = useState(true);

  const navigation = useNavigation();
  const handleBack = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      // fallback jika ChatAi adalah tab root
      navigation.navigate?.('DashboardUser');
    }
  };
  const listRef = useRef(null);
  const scrollToEnd = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  // --- MarkdownText: render **bold**, *italic*, `code`, dan [link](url) ---
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
  // parser inline sederhana (tanpa nested kompleks)
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    // cari simbol berikutnya
    const next = text.slice(i).match(/(\*\*|\*|`|\[|\n)/);
    if (!next) {
      tokens.push({ type: 'text', value: text.slice(i) });
      break;
    }

    // tambahkan teks biasa sebelum simbol
    const idx = i + next.index;
    if (idx > i) tokens.push({ type: 'text', value: text.slice(i, idx) });

    // posisi di simbol
    i = idx;

    // newline
    if (text[i] === '\n') {
      tokens.push({ type: 'newline' });
      i += 1;
      continue;
    }

    // bold ** ... **
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // italic * ... *
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'italic', value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // code ` ... `
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // link [label](url)
    if (text[i] === '[') {
      const endLabel = text.indexOf(']', i + 1);
      if (endLabel !== -1 && text[endLabel + 1] === '(') {
        const endUrl = text.indexOf(')', endLabel + 2);
        if (endUrl !== -1) {
          tokens.push({
            type: 'link',
            label: text.slice(i + 1, endLabel),
            href: text.slice(endLabel + 2, endUrl),
          });
          i = endUrl + 1;
          continue;
        }
      }
    }

    // fallback: kalau pola tidak lengkap, treat sebagai teks biasa 1 char
    tokens.push({ type: 'text', value: text[i] });
    i += 1;
  }

  // render ke <Text> bertingkat
  return (
    <Text style={baseStyle}>
      {tokens.map((t, idx) => {
        switch (t.type) {
          case 'text':
            return <Text key={idx}>{t.value}</Text>;
          case 'newline':
            return <Text key={idx}>{'\n'}</Text>;
          case 'bold':
            return <Text key={idx} style={boldStyle}>{t.value}</Text>;
          case 'italic':
            return <Text key={idx} style={italicStyle}>{t.value}</Text>;
          case 'code':
            return <Text key={idx} style={codeStyle}>{t.value}</Text>;
          case 'link':
            return (
              <Text
                key={idx}
                style={linkStyle}
                onPress={() => onPressLink?.(t.href)}
              >
                {t.label}
              </Text>
            );
          default:
            return null;
        }
      })}
    </Text>
  );
};


  // Ambil sesi setiap layar fokus
  useFocusEffect(
    React.useCallback(() => {
      let on = true;
      (async () => {
        try {
          setLoadingSess(true);
          const rows = await listChatSessions(); // butuh token
          if (!on) return;
          setSessions(rows || []);
          // pilih session: pakai last_session_id jika masih ada
          const last = await AsyncStorage.getItem('chat_last_session_id');
          const found = rows?.find?.(r => r.ID_ChatSession === last) || rows?.[0];
          if (found) {
            setSessionId(found.ID_ChatSession);
          } else {
            // jika tidak ada sesi sama sekali → buka picker biar user buat
            setSessionId(null);
            setPickerOpen(true);
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

  // Simpan id sesi yang dipilih
  useEffect(() => {
    if (sessionId) AsyncStorage.setItem('chat_last_session_id', sessionId).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
  let on = true;
  (async () => {
    if (!sessionId) { setMessages([]); return; }
    try {
      const rows = await getChatMessages(sessionId, { limit: 50, order: 'ASC' });
      if (!on) return;
      const mapped = rows.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt
      }));
      setMessages(mapped);
      // autoscroll setelah render
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    } catch (e) {
      if (!on) return;
      // jangan logout; cukup info
      console.log('getChatMessages error', e.message);
    }
  })();
  return () => { on = false; };
}, [sessionId]);


  async function onCreateSession() {
    try {
      const s = await createChatSession('Percakapan Baru');
      if (!s?.id) throw new Error('Sesi tidak terbentuk');
      // refresh list sederhana di memori
      const newRow = { ID_ChatSession: s.id, Title: s.title || 'Percakapan Baru' };
      setSessions(prev => [newRow, ...prev]);
      setSessionId(newRow.ID_ChatSession);
      setMessages([]); // belum ada endpoint get messages, jadi kosongkan
      setPickerOpen(false);
    } catch (e) {
      Alert.alert('Gagal buat sesi', e.message);
    }
  }

  function onSelectSession(id) {
    setSessionId(id);
    setMessages([]);
    setPickerOpen(false);
  }

   async function onDeleteSession(id) { // 🆕
    Alert.alert('Hapus sesi', 'Yakin ingin menghapus sesi ini beserta semua pesannya?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            await deleteChatSession(id);
            setSessions(prev => prev.filter(s => s.ID_ChatSession !== id));
            if (sessionId === id) {
              setSessionId(null);
              setMessages([]);
            }
          } catch (e) {
            Alert.alert('Gagal hapus', e.message);
          }
        }
      }
    ]);
  }

async function onSend() {
  const prompt = text.trim();
  if (!prompt || !sessionId || sending) return;

  setText('');
  const userMsg = { id: `user-${Date.now()}`, role: 'user', content: prompt };
  setMessages(prev => [...prev, userMsg]);
  scrollToEnd();

  setSending(true);
  setIsStopping(false);

  // 1x placeholder assistant “mengetik…”
  const tempId = `temp-${Date.now()}`;
  setMessages(prev => [...prev, { id: tempId, role: 'assistant', content: '...' }]);

  // 1x AbortController
  sendingCtrlRef.current = new AbortController();

  try {
    // ✅ model sebagai STRING, opts di argumen ke-4
    const { answer } = await sendChatMessage(
      sessionId,
      prompt,
      'gpt-3.5-turbo-0125',
      { signal: sendingCtrlRef.current.signal }
    );

    // ganti placeholder dengan jawaban
    setMessages(prev =>
      prev.map(m => (m.id === tempId ? { ...m, content: answer || '(kosong)' } : m))
    );
    scrollToEnd();
  } catch (e) {
    if (e.name === 'AbortError') {
      // Stop ditekan → hapus placeholder
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      Alert.alert('Gagal mengirim', e.message);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  } finally {
    setSending(false);
    setIsStopping(false);
    sendingCtrlRef.current = null;
  }
}

  
function onStop() {
  if (sending && sendingCtrlRef.current) {
    setIsStopping(true);
    try { sendingCtrlRef.current.abort(); } catch {}
  }
}
  
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
              color: textColor,
              paddingHorizontal: 4,
              borderRadius: 4,
            }}
            linkStyle={{ textDecorationLine: 'underline', color: mine ? '#1B5EAA' : '#DDEBFF' }}
            onPressLink={(href) => Alert.alert('Link', href)}
          />
      </View>
    </View>
  );
};


  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
     {/* Header */}
      <View style={{ width: 200, marginRight: 8, paddingTop:30 ,paddingBottom:2}}>
      <TouchableOpacity onPress={handleBack} style={{ padding: 6, alignSelf: 'flex-start' ,flexDirection:'row',alignItems:'center'}}>
        <Icon name="chevron-left" size={24} color="#1B3551" />
        <Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1B3551' }}>Kembali</Text>
      </Text>
      </TouchableOpacity>
      
    </View>
  <View
    style={{
      paddingTop: 0,
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    }}
  >
    {/* Stack kiri: Back di atas, Menu di bawah */}
    <View style={{ width: 40, marginRight: 8 }}>
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={{ padding: 6, alignSelf: 'flex-start', marginTop: 4 }}
      >
        <Icon name="menu" size={22} color="#1B3551" />
      </TouchableOpacity>
    </View>

    <Text style={{ fontSize: 28, fontWeight: '800', color: '#1B3551' }}>Pawang Air-AI</Text>

    <View style={{ marginLeft: 'auto', flexDirection: 'row' }}>
      <TouchableOpacity onPress={onCreateSession} style={{ padding: 8 }}>
        <Icon name="plus" size={22} color="#1B3551" />
      </TouchableOpacity>
      {sessionId ? (
   <TouchableOpacity
     onPress={() => onDeleteSession(sessionId)}
     style={{ padding: 8, marginLeft: 4 }}
   >
     <Icon name="trash-2" size={20} color="#B83434" />
   </TouchableOpacity>
 ) : null}
    </View>
  </View>
      {/* List chat */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
        onContentSizeChange={scrollToEnd}
        onLayout={scrollToEnd}
        ListEmptyComponent={
          !loadingSess && (
            <View style={{ padding: 24 }}>
              <Text style={{ color: '#6B7280' }}>
                {sessionId
                  ? 'Mulai percakapan dengan mengetik pesan di bawah.'
                  : 'Belum ada sesi. Ketuk tombol + untuk membuat sesi baru.'}
              </Text>
            </View>
          )
        }
      />

      {/* Input bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
        <View style={{ backgroundColor: '#4F72A8', borderRadius: 18, padding: 14 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', height: 46 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={sessionId ? "Send a message." : "Pilih / buat sesi dulu"}
              placeholderTextColor="#AAB2BF"
              style={{ flex: 1, color: '#1B3551', fontSize: 16 }}
              onSubmitEditing={onSend}
              editable={!sending && !!sessionId}
            />
         <TouchableOpacity
  onPress={sending ? onStop : onSend}
  // saat TIDAK sending, tombol disabled kalau teks kosong / belum pilih sesi
  // saat SEDANG sending, tombol AKTIF supaya bisa menekan Stop
  disabled={!sending && (!text.trim() || !sessionId)}
  style={{ paddingLeft: 10 }}
>
  {sending ? (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {/* pakai ikon stop; Feather bisa pakai 'x-octagon' / 'square' */}
      <Icon name="x-octagon" size={20} color="#B83434" />
      <Text style={{ color: '#B83434', fontWeight: '700', marginLeft: 6 }}>
        {isStopping ? 'Stopping…' : 'Stop'}
      </Text>
    </View>
  ) : (
    <Icon
      name="send"
      size={20}
      color={text.trim() && sessionId ? '#4F72A8' : '#C7CED9'}
    />
  )}
</TouchableOpacity>

          </View>
   {/* Bar aksi bawah: Stop saat mengirim */}
          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#E8ECF3' }}>{sessionId ? `Session: ${sessionId.slice(0, 8)}…` : 'no session'}</Text>
            {sending ? <Text style={{ color: '#E8ECF3' }}>mengirim…</Text> : (
              loadingSess ? <Text style={{ color: '#E8ECF3' }}>memuat sesi…</Text> : <View />
            )}
          </View>
       
        </View>
      </View>

      {/* Session Picker Modal */}
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
                keyExtractor={(it) => it.ID_ChatSession}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => onSelectSession(item.ID_ChatSession)}
                    style={{
                      paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8,
                      backgroundColor: item.ID_ChatSession === sessionId ? '#EEF2FF' : 'transparent'
                    }}
                  >
                   <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
     <Text style={{ color: '#6B7280', fontSize: 12, marginRight: 8 }}>
       {item.ID_ChatSession.slice(0, 8)}…
     </Text>
     <TouchableOpacity
       onPress={() => onDeleteSession(item.ID_ChatSession)}
       style={{ padding: 6, marginLeft: 'auto' }}
     >
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
