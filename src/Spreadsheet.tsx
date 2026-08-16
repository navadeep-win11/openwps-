import React, { useRef, useEffect } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';

export default function Spreadsheet() {
  const settings = {
    data: [{
      name: "Sheet1",
      celldata: [
        { r: 0, c: 0, v: { v: "Sales Report", m: "Sales Report", bl: 1, fs: 14 } },
        { r: 1, c: 0, v: { v: "Item", m: "Item", bl: 1 } },
        { r: 1, c: 1, v: { v: "Price", m: "Price", bl: 1 } },
        { r: 1, c: 2, v: { v: "Quantity", m: "Quantity", bl: 1 } },
        { r: 1, c: 3, v: { v: "Total", m: "Total", bl: 1 } },
        { r: 2, c: 0, v: { v: "Apple", m: "Apple" } },
        { r: 2, c: 1, v: { v: 1.5, m: "1.5", ct: { fa: "General", t: "n" } } },
        { r: 2, c: 2, v: { v: 100, m: "100", ct: { fa: "General", t: "n" } } },
        { r: 2, c: 3, v: { f: "=B3*C3", v: 150, m: "150" } },
        { r: 3, c: 0, v: { v: "Banana", m: "Banana" } },
        { r: 3, c: 1, v: { v: 0.8, m: "0.8", ct: { fa: "General", t: "n" } } },
        { r: 3, c: 2, v: { v: 250, m: "250", ct: { fa: "General", t: "n" } } },
        { r: 3, c: 3, v: { f: "=B4*C4", v: 200, m: "200" } },
        { r: 4, c: 0, v: { v: "Total Revenue", m: "Total Revenue", bl: 1 } },
        { r: 4, c: 3, v: { f: "=SUM(D3:D4)", v: 350, m: "350", bl: 1 } },
      ],
      config: {
        merge: {
          "0_0": { r: 0, c: 0, rs: 1, cs: 4 }
        }
      }
    }],
    lang: 'en',
    showToolbar: true,
    showGridHeading: true,
    showSheetTabs: true,
    showContextmenu: true,
  };

  return (
    <div className="w-full flex flex-col items-center bg-black/20 p-2 sm:p-4 rounded-3xl overflow-hidden border border-white/20 shadow-inner" style={{ height: '80vh' }}>
      <div className="w-full h-full bg-white rounded-2xl overflow-hidden relative">
        <Workbook data={settings.data} lang={settings.lang} />
      </div>
    </div>
  );
}
