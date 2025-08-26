import * as React from "react";
import Svg, { G, Rect, Path, Defs, Text as SvgText } from "react-native-svg";

/* SVGR has dropped some elements not supported by react-native-svg: filter */
const Alat_IoT = ({
  status = {},                 // { PH, Suhu, Salinitas, Kekeruhan } → 'ok' | 'stale' | 'error'
  okColor = "#00FF37",
  warnColor = "#F59E0B",
  errColor = "#FF2D2D",
  label,                       // optional: override teks status
  ...props
}) => {
  const col = (k) => {
    const s = (status?.[k] || 'error').toLowerCase();
    if (s === 'ok') return okColor;
    if (s === 'stale') return warnColor;
    return errColor;
  };

  // ---- Ringkas status untuk panel teks (Rect putih) ----
  const vals = ['PH','Suhu','Salinitas','Kekeruhan']
    .map(k => (status?.[k] || 'error').toLowerCase());

  const allErr   = vals.length && vals.every(v => v === 'error');
  const anyErr   = vals.some(v => v === 'error');
  const anyStale = vals.some(v => v === 'stale');
  const allOk    = vals.length && vals.every(v => v === 'ok');

  let autoText = 'Tidak Ada Kerusakan';
  let textColor = okColor;

  if (allErr) {
    autoText = 'Alat Tidak Merespons';
    textColor = errColor;
  } else if (anyErr) {
    autoText = 'Sensor Bermasalah';
    textColor = errColor;
  } else if (anyStale) {
    autoText = 'Data Sensor Lama';
    textColor = warnColor;
  } else if (allOk) {
    autoText = 'Tidak Ada Kerusakan';
    textColor = okColor;
  }

  const panelText = (label ?? autoText);

  return (
    <Svg
      width={201}
      height={355}
      viewBox="0 0 201 355"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <G filter="url(#filter0_d_367_55)">
        <Rect x={4} width={173} height={228} rx={29} fill="#D9D9D9" />
      </G>

      {/* batang status tiap sensor */}
      <G filter="url(#filter1_d_367_55)">
        <Path d="M34 218H48V319C48 322.866 44.866 326 41 326V326C37.134 326 34 322.866 34 319V218Z" fill={col('PH')} />
      </G>
      <G filter="url(#filter2_d_367_55)">
        <Path d="M70 218H84V326C84 329.866 80.866 333 77 333V333C73.134 333 70 329.866 70 326V218Z" fill={col('Suhu')} />
      </G>
      <G filter="url(#filter3_d_367_55)">
        <Path d="M104 218H118V306C118 309.866 114.866 313 111 313V313C107.134 313 104 309.866 104 306V218Z" fill={col('Salinitas')} />
      </G>
      <G filter="url(#filter4_d_367_55)">
        <Path d="M137 218H151V340C151 343.866 147.866 347 144 347V347C140.134 347 137 343.866 137 340V218Z" fill={col('Kekeruhan')} />
      </G>

      {/* ... ikon/ornamen bawaan ... */}
      <Path d="M74.4177 240.12L77.1277 237.32C77.2944 237.153 77.4277 237 77.5277 236.86C77.6277 236.72 77.7011 236.59 77.7477 236.47C77.7944 236.343 77.8177 236.217 77.8177 236.09C77.8177 235.817 77.7277 235.603 77.5477 235.45C77.3744 235.29 77.1444 235.21 76.8577 235.21C76.5777 235.21 76.3244 235.287 76.0977 235.44C75.8777 235.587 75.6644 235.83 75.4577 236.17L74.4077 235.26C74.6877 234.787 75.0444 234.43 75.4777 234.19C75.9111 233.95 76.4077 233.83 76.9677 233.83C77.4544 233.83 77.8744 233.92 78.2277 234.1C78.5877 234.28 78.8644 234.537 79.0577 234.87C79.2577 235.203 79.3577 235.593 79.3577 236.04C79.3577 236.32 79.3211 236.58 79.2477 236.82C79.1744 237.053 79.0544 237.287 78.8877 237.52C78.7277 237.747 78.5111 237.997 78.2377 238.27L76.3577 240.14L74.4177 240.12ZM74.4177 241V240.12L75.7477 239.66H79.4977V241H74.4177Z" fill="black" />
      <Path d="M110.737 241.11C110.25 241.11 109.804 241.027 109.397 240.86C108.99 240.687 108.647 240.44 108.367 240.12L109.377 239.11C109.504 239.297 109.687 239.45 109.927 239.57C110.174 239.683 110.434 239.74 110.707 239.74C110.954 239.74 111.167 239.697 111.347 239.61C111.527 239.523 111.667 239.4 111.767 239.24C111.874 239.08 111.927 238.89 111.927 238.67C111.927 238.45 111.874 238.263 111.767 238.11C111.667 237.95 111.517 237.827 111.317 237.74C111.124 237.653 110.89 237.61 110.617 237.61C110.49 237.61 110.357 237.62 110.217 237.64C110.084 237.653 109.97 237.677 109.877 237.71L110.567 236.84C110.754 236.787 110.93 236.743 111.097 236.71C111.27 236.67 111.43 236.65 111.577 236.65C111.937 236.65 112.26 236.737 112.547 236.91C112.834 237.077 113.06 237.317 113.227 237.63C113.4 237.937 113.487 238.303 113.487 238.73C113.487 239.197 113.37 239.61 113.137 239.97C112.91 240.33 112.59 240.61 112.177 240.81C111.77 241.01 111.29 241.11 110.737 241.11ZM109.877 237.71V236.84L111.597 234.82L113.357 234.81L111.567 236.85L109.877 237.71ZM108.807 235.27V233.94H113.357V234.81L112.127 235.27H108.807Z" fill="black" />
      <Path d="M141.663 238.55L143.983 233.94H145.693L143.323 238.55H141.663ZM141.663 239.43V238.55L142.183 238.1H147.323V239.43H141.663ZM144.993 241V236.63H146.533V241H144.993Z" fill="black" />
      <Path d="M199.5 95H163V77H184.5V32H199.5V95Z" fill="#D9D9D9" />
      <G filter="url(#filter5_d_367_55)">
        <Path d="M197 95H171V79.2857H186.315V40H197V95Z" fill="#2E2E2E" />
      </G>
      <G filter="url(#filter6_d_367_55)">
        <Rect x={16} y={11} width={153} height={210} rx={29} fill="#9ED0FF" />
      </G>

      {/* ====== PANEL STATUS (di atas layar alat) ====== */}
      <G filter="url(#filter7_d_367_55)">
        <Rect x={34} y={68} width={117} height={27} rx={6} fill="white" />
        {/* Teks status di tengah panel */}
        <SvgText
          x={34 + 117 / 2}
          y={68 + 27 / 2 + 4}    // +4 ~ koreksi baseline
          fontSize={11}
          fontWeight="700"
          fill={textColor}
          textAnchor="middle"
        >
          {panelText}
        </SvgText>
      </G>

      <Path d="M39.6704 241V233.94H41.2304V241H39.6704ZM38.3104 235.27V233.94H41.1304V235.27H38.3104Z" fill="black" />
      <Defs />
    </Svg>
  );
};

export default Alat_IoT;
