export const dummyTambakList = [
    {
      ID_Tambak: 'T001',
      Nama: 'Tambak A',
      Substrat: 'Pasir',
      ID_Perangkat: 'DEV001',
      Latitude: 0.9758911829398729, 
      Longitude: 104.47286023813348,
      keterangan: 'Tambak pengirim 1',
    },
    {
      ID_Tambak: 'T002',
      Nama: 'Tambak B',
      Substrat: 'Lumpur',
      ID_Perangkat: 'DEV002',
      Latitude: 0.9762333590979166, 
      Longitude: 104.47270356444334,
      keterangan: 'Tambak pengirim 2',
    },
    {
      ID_Tambak: 'T003',
      Nama: 'Tambak C',
      Substrat: 'Campuran',
      ID_Perangkat: 'DEV003',
      Latitude: 0.9764570761339872, 
      Longitude: 104.47248703237685,
      keterangan: 'Tambak pengirim 3',
    },
    {
      ID_Tambak: 'T004',
      Nama: 'Tambak D',
      Substrat: 'Batu Kapur',
      ID_Perangkat: 'DEV004',
      Latitude: 0.9767986656755815, 
      Longitude: 104.47238598447667,
      keterangan: 'Tambak pengirim 4',
    },
  ];
  
  export const penerimaTambak = {
    ID_Tambak: 'T999',
    Nama: 'Penerima Data IoT',
    Substrat: '-',
    ID_Perangkat: '-',
    Latitude: 0.9762667008968536, 
    Longitude: 104.47212614783213,
    keterangan: 'Tambak penerima data IoT dari T001 - T004',
  };
  
  export const dummyPerangkatList = [
  {
    ID_Perangkat: 'DEV001',
    Nama_LokasiPerangkat: 'Tambak A - Pasir',
    Endpoint_Data: 'https://api.example.com/perangkat/dev001/data',
    Endpoint_Firebase: 'perangkat/dev001/firebase',
    Status: 'Aktif'
  },
  {
    ID_Perangkat: 'DEV002',
    Nama_LokasiPerangkat: 'Tambak B - Lumpur',
    Endpoint_Data: 'https://api.example.com/perangkat/dev002/data',
    Endpoint_Firebase: 'perangkat/dev002/firebase',
    Status: 'Non Aktif'
  },
  {
    ID_Perangkat: 'DEV003',
    Nama_LokasiPerangkat: 'Tambak C - Campuran',
    Endpoint_Data: 'https://api.example.com/perangkat/dev003/data',
    Endpoint_Firebase: 'perangkat/dev003/firebase',
    Status: 'Aktif'
  },
  {
    ID_Perangkat: 'DEV004',
    Nama_LokasiPerangkat: 'Tambak D - Batu Kapur',
    Endpoint_Data: 'https://api.example.com/perangkat/dev004/data',
    Endpoint_Firebase: 'perangkat/dev004/firebase',
    Status: 'Aktif'
  },
  {
    ID_Perangkat: 'DEV999',
    Nama_LokasiPerangkat: 'Penerima Data IoT',
    Endpoint_Data: 'https://api.example.com/perangkat/dev999/data',
    Endpoint_Firebase: 'perangkat/dev999/firebase',
    Status: 'Aktif'
  },
];


  // Contoh cara ambil data relasi (join dummy)
export const tambakWithPerangkat = dummyTambakList.map(tambak => {
  const perangkat = dummyPerangkatList.find(
    p => p.ID_Perangkat === tambak.ID_Perangkat
  );

  return {
    ...tambak,
    Nama_LokasiPerangkat: perangkat?.Nama_LokasiPerangkat || '-',
    Endpoint_Data: perangkat?.Endpoint_Data || '-',
    Endpoint_Firebase: perangkat?.Endpoint_Firebase || '-',
    Status: perangkat?.Status || '-',
  };
});

console.log(tambakWithPerangkat);