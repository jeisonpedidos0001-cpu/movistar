import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function App() {
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleConsultar = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setResultado(null);

    if (!numero || numero.length < 10) {
      setError('Por favor, ingresa un número de 10 dígitos válido.');
      return;
    }

    if (!executeRecaptcha) {
      setError('El servicio de reCAPTCHA no ha cargado aún. Intenta de nuevo.');
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener el token de Google reCAPTCHA v3 silenciosamente
      const recaptchaToken = await executeRecaptcha('consultar_deuda');
      
      // 2. Enviar el número y el captcha a nuestro Proxy Local
      const response = await axios.post('http://localhost:4000/api/consultar', {
        numero: numero,
        recaptchaToken: recaptchaToken
      });

      // 3. Mostrar el resultado
      setResultado(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error de comunicación con el servidor. Verifica que el proxy (server.js) esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, [executeRecaptcha, numero]);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 10) {
      setNumero(value);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="logo-circle">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
            <path d="M5.76 5.737c-.927.015-2.637.48-3.419 3.722-.34 1.413-.472 2.886-.18 4.639a17.989 17.989 0 001.065 3.781c.11.265.282.542.414.712.381.489 1.015.457 1.281.324.29-.145.624-.496.504-1.296-.059-.387-.227-.953-.322-1.267-.29-.966-.678-2.13-.712-2.96-.045-1.11.386-1.255.672-1.319.48-.107.884.43 1.267 1.102.457.802 1.24 2.224 1.88 3.31.576.98 1.64 2.03 3.35 1.959 1.743-.074 3.028-.75 3.69-2.877.495-1.591.832-2.78 1.375-3.999.625-1.4 1.458-2.15 2.16-1.921.651.212.814.86.822 1.81.007.842-.09 1.77-.163 2.45-.028.248-.076.745-.057 1.022.04.543.271 1.085.873 1.172.64.092 1.155-.428 1.36-1.058a5.94 5.94 0 00.188-.896c.188-1.36.237-2.274.152-3.665-.1-1.626-.413-3.11-.96-4.393-.522-1.228-1.362-2.014-2.439-2.084-1.192-.077-2.56.727-3.278 2.286-.661 1.438-1.19 2.914-1.512 3.667-.325.763-.804 1.234-1.54 1.313-.899.096-1.674-.568-2.242-1.514-.495-.824-1.476-2.395-2-2.922-.494-.496-1.057-1.116-2.23-1.098z"></path>
          </svg>
        </div>
        <h1>Consulta tu deuda</h1>
        <p>Servicio rápido y seguro de Movistar</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleConsultar}>
          <div className="input-group">
            <label htmlFor="numero">Número de línea o referencia</label>
            <div className="input-wrapper">
              <input 
                id="numero"
                type="tel" 
                placeholder="Ej. 3162511612" 
                value={numero}
                onChange={handlePhoneChange}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-consultar" 
            disabled={loading || numero.length < 10}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Procesando...
              </>
            ) : (
              'Consultar Deuda'
            )}
          </button>
        </form>

        {error && (
          <div className="error-msg">
            {error}
          </div>
        )}

        {resultado && (
          <div className="result-card">
            {/* Adapta estos campos según la respuesta exacta que envíe Movistar */}
            <div className="result-item">
              <span className="result-label">Referencia</span>
              <span className="result-value">{numero}</span>
            </div>
            {resultado.totalDebt !== undefined ? (
              <div className="result-item">
                <span className="result-label">Total a pagar</span>
                <span className="result-value amount">
                  ${Number(resultado.totalDebt).toLocaleString('es-CO')}
                </span>
              </div>
            ) : (
              <div className="result-item">
                <span className="result-label">Estado</span>
                <span className="result-value" style={{color: 'green'}}>Sin deuda reportada / Consulta exitosa</span>
              </div>
            )}
            
            <div className="result-item" style={{flexDirection: 'column', marginTop: '10px', paddingBottom: '0'}}>
              <span className="result-label" style={{marginBottom: '5px'}}>Respuesta cruda de la API:</span>
              <pre style={{fontSize: '11px', background: '#e2ebf3', padding: '10px', borderRadius: '8px', overflowX: 'auto'}}>
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
