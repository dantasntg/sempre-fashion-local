import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Code 128 via jsbarcode — não é um GTIN/EAN oficial, é o identificador
// interno da loja (ex: "SF000001") representado visualmente.
export default function BarcodeSVG({ codigo, height = 50, mostrarTexto = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !codigo) return;
    try {
      JsBarcode(ref.current, codigo, {
        format: 'CODE128',
        width: 1.7,
        height,
        displayValue: mostrarTexto,
        margin: 0,
        background: 'transparent',
        lineColor: '#1C1917',
        fontSize: 12,
      });
    } catch (e) {
      // código vazio/inválido — não derruba a tela
    }
  }, [codigo, height, mostrarTexto]);

  if (!codigo) return null;
  return <svg ref={ref} style={{ width: '100%', height: mostrarTexto ? height + 16 : height }} />;
}
