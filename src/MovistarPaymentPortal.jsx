import React, { useState, useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import axios from 'axios';
import './MovistarPaymentPortal.css';

// ── Imágenes ──
import imgTelefonos from './assets/img/telefonos.webp';
import imgBancos from './assets/img/bancos.webp';
import imgIphone from './assets/img/iphone.png';
import imgPersonaRoam from './assets/img/persona-roaming.png';
import imgRobot from './assets/img/robot.svg';
import imgSelloMov from './assets/img/sello-movistar.webp';
import imgSSL from './assets/img/SSL.webp';
import imgSIC from './assets/img/superintendencia.webp';
import imgMovBlan from './assets/img/movistar-blanco.webp';
import imgTelefonica from './assets/img/marca-telefonica.webp';
import imgPse from './assets/img/PSE.svg';
import imgBreB from './assets/img/BRE-B.svg';
import imgOtroIcon from './assets/img/OTROICON.svg';
import CheckoutCobre from './CheckoutCobre';

const MovistarPaymentPortal = () => {
  const [activeTab, setActiveTab] = useState('pospago');
  const [openFaq, setOpenFaq] = useState(null);
  const [lineNumber, setLineNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('pse');
  const [showCobreCheckout, setShowCobreCheckout] = useState(false);

  const { executeRecaptcha } = useGoogleReCaptcha();

  const faqs = [
    { q: '¿Cómo puedo pagar mi factura en línea de forma segura?', a: 'Ingresando a nuestro sitio oficial https://www.movistar.com.co/ o a través de nuestra App móvil movistar.' },
    { q: '¿Qué medios de pago están disponibles para realizar mi pago?', a: 'Puedes realizar el pago de tu factura Movistar con tarjetas crédito y débito, PSE, Bre-B y billeteras digitales cómo Daviplata. Tu pago se verá reflejado inmediatamente.' },
    { q: '¿Necesito estar registrado para realizar un pago en la plataforma?', a: 'No, nuestro portal de pago se encuentra expuesto en el sitio público de https://www.movistar.com.co' },
    { q: '¿Cómo sé si mi pago fue realizado correctamente?', a: 'La aplicación del pago se realiza en línea en nuestro sistema facturador e inmediatamente llega un SMS con la confirmación de la aplicación.' },
    { q: '¿Qué hago si mi pago fue rechazado o presenta un error?', a: 'Lo primero es revisar si la tarjeta o cuenta bancaria se encuentre habilitada y con saldo para la transacción, si todo esta en orden y la transacción genera error, se puede hacer el escalamiento por los canales de servicio al cliente del banco y de movistar.' },
    { q: '¿Cuánto tiempo tarda en verse reflejado mi pago?', a: 'La aplicación de los pagos se realiza en línea en nuestro sistema, por lo cual lo podrás ver aplicado en tan solo minutos en tu cuenta Movistar.' },
    { q: '¿Puedo pagar una factura vencida desde la plataforma?', a: 'Si es posible, nuestro portal de pagos no restringe si la factura esta vencida.' },
    { q: '¿Cómo obtengo el comprobante o recibo de mi pago?', a: 'El soporte del pago se te genera al final de la transacción (ultima pantalla) y lo podrás descargar en formato PDF.' },
    { q: '¿Es seguro ingresar mis datos personales y financieros en esta página?', a: 'Sí, nuestro portal de pagos cuenta con todas las políticas de seguridad necesarias para proteger la transacción y datos ingresados.' },
    { q: '¿A quién puedo contactar si tengo un problema con mi pago?', a: 'Puedes realizar el escalamiento a través de nuestros canales habilitados en https://www.movistar.com.co/ y *611.' },
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleConsultar = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setResultado(null);
    setShowCobreCheckout(false);

    if (!lineNumber || lineNumber.length < 10) {
      setError('Por favor, ingresa un número de 10 dígitos válido.');
      return;
    }
    if (!executeRecaptcha) {
      setError('El servicio de reCAPTCHA no ha cargado aún.');
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('consultar_deuda');
      const response = await axios.post('/api/consultar', {
        numero: lineNumber,
        recaptchaToken,
      });
      setResultado(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error de comunicación. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, [executeRecaptcha, lineNumber]);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) setLineNumber(value);
  };

  const handleContinuarPago = () => {
    if (selectedPaymentMethod === 'pse') {
      setIsPaymentModalOpen(false);
      setShowCobreCheckout(true);
    } else {
      alert(`Método seleccionado: ${selectedPaymentMethod} (Funcionalidad pendiente)`);
    }
  };

  if (showCobreCheckout) {
    const val = resultado?.values || {};
    const inv = (val.invoiceInformationQiItem && val.invoiceInformationQiItem.length > 0) ? val.invoiceInformationQiItem[0] : {};
    const totalAmount = inv.serviceAmountTotal || val.transactionValue || 0;
    return <CheckoutCobre amount={totalAmount} />;
  }

  return (
    <div className="mp-portal">

      {/* ─── HEADER ─── */}
      <header className="mp-header">
        <div className="mp-container">
          <div className="mp-logo-wrap">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M5.76 5.737c-.927.015-2.637.48-3.419 3.722-.34 1.413-.472 2.886-.18 4.639a17.989 17.989 0 001.065 3.781c.11.265.282.542.414.712.381.489 1.015.457 1.281.324.29-.145.624-.496.504-1.296-.059-.387-.227-.953-.322-1.267-.29-.966-.678-2.13-.712-2.96-.045-1.11.386-1.255.672-1.319.48-.107.884.43 1.267 1.102.457.802 1.24 2.224 1.88 3.31.576.98 1.64 2.03 3.35 1.959 1.743-.074 3.028-.75 3.69-2.877.495-1.591.832-2.78 1.375-3.999.625-1.4 1.458-2.15 2.16-1.921.651.212.814.86.822 1.81.007.842-.09 1.77-.163 2.45-.028.248-.076.745-.057 1.022.04.543.271 1.085.873 1.172.64.092 1.155-.428 1.36-1.058a5.94 5.94 0 00.188-.896c.188-1.36.237-2.274.152-3.665-.1-1.626-.413-3.11-.96-4.393-.522-1.228-1.362-2.014-2.439-2.084-1.192-.077-2.56.727-3.278 2.286-.661 1.438-1.19 2.914-1.512 3.667-.325.763-.804 1.234-1.54 1.313-.899.096-1.674-.568-2.242-1.514-.495-.824-1.476-2.395-2-2.922-.494-.496-1.057-1.116-2.23-1.098z" fill="#0B9CEA" />
            </svg>
          </div>
          <h1 className="mp-hero-title">Portal de pagos Movistar</h1>
          <p className="mp-hero-sub">
            Gestiona tus pagos de forma rápida y segura: Consulta tu saldo, agrega o edita tus facturas, y
            realiza el pago de manera sencilla en Movistar.
          </p>
        </div>
      </header>

      {/* ─── MAIN SECTION: FORM + PROMO ─── */}
      <section className="mp-main">
        {!resultado && (
          <div className="mp-container mp-main-grid">

          {/* FORM CARD */}
          <div className="mp-form-card">
            <div className="mp-tabs">
              <button
                className={`mp-tab ${activeTab === 'pospago' ? 'mp-tab--active' : ''}`}
                onClick={() => setActiveTab('pospago')}
              >
                {/* Pospago icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.408 19.208c.193.2.479.306.82.306.342 0 .636-.11.827-.306.19-.196.288-.467.288-.81 0-.697-.414-1.114-1.112-1.114-.697 0-1.112.417-1.112 1.115 0 .339.096.61.289.81zm5.179-8.425h3.286a.42.42 0 100-.84h-3.286a.42.42 0 100 .84zm0 1.638h3.286a.42.42 0 100-.84h-3.286a.42.42 0 100 .84zm3.286 1.639h-3.286a.42.42 0 110-.84h3.286a.42.42 0 110 .84z"></path>
                  <path d="M6.951 21.847h6.555c1.106 0 1.91-.266 2.465-.812.555-.552.826-1.365.826-2.48v-2.45l1.113-.001h1.56c.523 0 .873-.352.873-.876V8.444a.55.55 0 00-.165-.395l-2.731-2.732a.55.55 0 00-.395-.165h-.262c-.045-.939-.313-1.645-.816-2.154-.563-.566-1.37-.843-2.468-.843H6.95c-1.109 0-1.919.272-2.47.826-.552.555-.821 1.362-.821 2.465v13.11c0 1.114.269 1.924.826 2.479.552.546 1.359.812 2.465.812zm8.717-16.695h-2.66c-.533 0-.889.356-.889.885v9.177c0 .532.356.89.888.89h2.67v2.452c0 1.582-.588 2.17-2.171 2.17H6.95c-1.582 0-2.17-.588-2.17-2.17V5.446c0-.792.159-1.341.492-1.675.334-.333.883-.496 1.678-.496h6.555c1.438 0 2.083.55 2.162 1.877zm-2.428 9.83v-8.71h2.983v.813c0 1.398.801 2.199 2.199 2.199h.798v5.697h-5.98zm4.103-8.183l1.364 1.364h-.285c-.39 0-.67-.084-.832-.246-.163-.163-.247-.443-.247-.832v-.286z"></path>
                </svg>
                Pospago
              </button>
              <button
                className={`mp-tab ${activeTab === 'internet' ? 'mp-tab--active' : ''}`}
                onClick={() => setActiveTab('internet')}
              >
                {/* Internet icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.368 10.595c.468.46.6 1.106.347 1.692-.269.616-.91 1.014-1.633 1.014h-.504v6.932c0 .888-.787 1.611-1.756 1.611H6.062c-.969 0-1.759-.723-1.759-1.61V13.3h-.389c-.723 0-1.364-.398-1.633-1.014-.252-.583-.12-1.23.347-1.692l8.084-7.953c.661-.65 1.91-.65 2.575 0l8.08 7.953zm-.81 1.221c.042-.092.06-.232-.087-.375l-8.08-7.953a.565.565 0 00-.393-.15.56.56 0 00-.392.15l-8.081 7.953c-.146.143-.126.283-.087.375.059.132.213.275.479.275H4.93c.344 0 .627.271.627.605v7.535c0 .22.227.4.507.4h11.76c.277 0 .504-.18.504-.4v-7.535c0-.334.28-.605.627-.605h1.129c.26 0 .417-.14.473-.275zm-8.179 5.622c0-.134 0-.359-.356-.367h-.067c-.31.003-.336.18-.336.364 0 .143 0 .364.345.367.414-.005.414-.23.414-.364zm-.378-1.415c.75.02 1.462.463 1.462 1.415 0 .958-.709 1.398-1.412 1.412h-.1c-.704-.009-1.415-.451-1.415-1.418 0-.966.709-1.406 1.412-1.411 0 .002.05.002.053.002zm5.784-4.834c-2.305-2.49-5.736-2.325-5.843-2.314-3.62.039-5.587 2.028-5.731 2.174l-.006.005a.589.589 0 00.045.854.647.647 0 00.885-.041l.001-.002c.051-.052 1.713-1.75 4.845-1.783.034-.003 2.972-.134 4.869 1.913a.635.635 0 00.467.202c.149 0 .297-.05.418-.154a.592.592 0 00.05-.854zm-5.837.042c.095-.009 2.832-.096 4.577 1.79.23.249.207.63-.05.854a.644.644 0 01-.886-.048c-1.318-1.425-3.504-1.388-3.607-1.386h-.003c-2.208.025-3.537 1.375-3.577 1.416v.001a.633.633 0 01-.466.196.63.63 0 01-.42-.157.588.588 0 01-.045-.851c.07-.076 1.698-1.787 4.477-1.815zm.025 2.406h-.009c-1.857.02-2.952 1.17-3 1.221a.587.587 0 00.045.849.65.65 0 00.885-.04cc.031-.033.79-.809 2.104-.823h.014c.142.002 1.358.014 2.087.804.232.25.627.269.885.048a.592.592 0 00.05-.855c-1.147-1.237-2.912-1.207-3.06-1.204z"></path>
                </svg>
                Internet
              </button>
            </div>

            <form className="mp-form-body" onSubmit={handleConsultar}>

              {/* ── CUSTOM DROPDOWN ── */}
              <div className="mp-dropdown-wrap">
                <div
                  className={`mp-dropdown-trigger ${dropdownOpen ? 'mp-dropdown-trigger--open' : ''} ${selectedId ? 'mp-dropdown-trigger--selected' : ''}`}
                  onClick={() => setDropdownOpen(o => !o)}
                >
                  <div className="mp-dropdown-label-wrap">
                    {selectedId && <span className="mp-dropdown-float-label">Identificador de pago</span>}
                    <span className={`mp-dropdown-value ${!selectedId ? 'mp-dropdown-value--placeholder' : ''}`}>
                      {selectedId === 'linea' ? 'Con número de línea Pospago'
                        : selectedId === 'referencia' ? 'Con referencia de pago'
                          : 'Identificador de pago'}
                    </span>
                  </div>
                  <svg className={`mp-dropdown-chevron ${dropdownOpen ? 'mp-dropdown-chevron--open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6c6f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {dropdownOpen && (
                  <div className="mp-dropdown-menu">
                    <div
                      className={`mp-dropdown-option ${selectedId === 'linea' ? 'mp-dropdown-option--active' : ''}`}
                      onClick={() => { setSelectedId('linea'); setDropdownOpen(false); setLineNumber(''); }}
                    >
                      Con número de línea Pospago
                    </div>
                    <div
                      className={`mp-dropdown-option ${selectedId === 'referencia' ? 'mp-dropdown-option--active' : ''}`}
                      onClick={() => { setSelectedId('referencia'); setDropdownOpen(false); setLineNumber(''); }}
                    >
                      Con referencia de pago
                    </div>
                  </div>
                )}
              </div>

              {/* ── HELP LINK (solo referencia) ── */}
              {selectedId === 'referencia' && (
                <a href="#" className="mp-help-link">¿Dónde encuentro el número de referencia de pago?</a>
              )}

              {/* ── INPUT SIEMPRE VISIBLE ── */}
              <div className="mp-form-group">
                <input
                  type={selectedId === 'referencia' ? 'text' : 'tel'}
                  value={lineNumber}
                  onChange={handlePhoneChange}
                  placeholder={
                    selectedId === 'referencia'
                      ? 'Ingresa la referencia de pago'
                      : 'Ingresa la línea Pospago Movistar'
                  }
                  disabled={loading}
                  autoComplete="off"
                  className="mp-input-ref"
                />
              </div>

              <button type="submit" className="mp-btn-continue" disabled={loading || lineNumber.length < 1}>
                {loading ? <span className="mp-spinner"></span> : 'Continuar'}
              </button>

              <button type="button" className="mp-btn-autopay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
                Activar o actualizar tu pago automático
              </button>

              {error && <div className="mp-error">{error}</div>}

            </form>
          </div>

          {/* PROMO BANNER — cambia cuando hay resultado */}
          <div className="mp-promo">
            <img
              src={imgTelefonos}
              alt="Celulares disponibles"
              className="mp-promo-img"
            />
          </div>
        </div>
        )}

        {/* ─── DETALLE DE FACTURA (SPA — aparece debajo cuando hay resultado) ─── */}
        {resultado && resultado.values && (() => {
          const val = resultado.values;
          const inv = (val.invoiceInformationQiItem && val.invoiceInformationQiItem.length > 0) ? val.invoiceInformationQiItem[0] : {};
          const totalAmount = inv.serviceAmountTotal || val.transactionValue || 0;

          return (
          <div className="mp-container mp-detalle-wrap">
            <div className="mp-detalle-card">
              <h2 className="mp-detalle-title">Detalle de tu factura</h2>

              <div className="mp-detalle-body">
                {/* Columna izquierda: info del producto */}
                <div className="mp-detalle-info">
                  <p className="mp-detalle-section-label">Información de tu producto</p>
                  <div className="mp-detalle-rows">
                    <div className="mp-detalle-row">
                      <span className="mp-detalle-key">Usuario</span>
                      <span className="mp-detalle-val">{val.clientName || '—'}</span>
                    </div>
                    <div className="mp-detalle-row">
                      <span className="mp-detalle-key">N° de línea</span>
                      <span className="mp-detalle-val mp-detalle-val--link">{val.phoneNumber || 'No aplica'}</span>
                    </div>
                    <div className="mp-detalle-row">
                      <span className="mp-detalle-key">Ref. de pago</span>
                      <span className="mp-detalle-val">{inv.accountNumberCustomerAccount || '—'}</span>
                    </div>
                    <div className="mp-detalle-row">
                      <span className="mp-detalle-key">Servicio</span>
                      <span className="mp-detalle-val">Móvil</span>
                    </div>
                    <div className="mp-detalle-row">
                      <span className="mp-detalle-key">Operador</span>
                      <span className="mp-detalle-val">Movistar</span>
                    </div>
                    <div className="mp-detalle-row">
                      <span className="mp-detalle-key">N° Factura</span>
                      <span className="mp-detalle-val">{inv.invoiceSNPaymentInfoRel || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Columna derecha: editar pago */}
                <div className="mp-detalle-pago">
                  <div className="mp-detalle-pago-header">
                    <span className="mp-detalle-section-label">Editar pago</span>
                    <button className="mp-detalle-eliminar" onClick={() => setResultado(null)}>
                      Eliminar factura de mi lista
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                  </div>

                  <div className="mp-detalle-campo">
                    <label className="mp-detalle-campo-label">Servicio</label>
                    <div className="mp-detalle-campo-row">
                      <span className="mp-detalle-campo-prefix">$</span>
                      <input
                        className="mp-detalle-campo-input"
                        defaultValue={totalAmount}
                        readOnly
                      />
                      <button className="mp-detalle-campo-edit" aria-label="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <input type="checkbox" className="mp-detalle-check" defaultChecked />
                    </div>
                  </div>

                  <div className="mp-detalle-campo">
                    <label className="mp-detalle-campo-label">Equipo a cuotas</label>
                    <div className="mp-detalle-campo-row">
                      <span className="mp-detalle-campo-prefix">$</span>
                      <input className="mp-detalle-campo-input" defaultValue="0" readOnly />
                      <button className="mp-detalle-campo-edit" aria-label="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <input type="checkbox" className="mp-detalle-check" />
                    </div>
                  </div>

                  <div className="mp-detalle-campo">
                    <label className="mp-detalle-campo-label">Contenidos adicionales</label>
                    <div className="mp-detalle-campo-row">
                      <span className="mp-detalle-campo-prefix">$</span>
                      <input className="mp-detalle-campo-input" defaultValue="0" readOnly />
                      <button className="mp-detalle-campo-edit" aria-label="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <input type="checkbox" className="mp-detalle-check" />
                    </div>
                  </div>

                  <div className="mp-detalle-campo-total">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}>
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    <span>Total</span>
                    <strong className="mp-detalle-total-amount">
                      ${Number(totalAmount).toLocaleString('es-CO')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra inferior */}
            <div className="mp-detalle-footer">
              <div className="mp-detalle-footer-total">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <span className="mp-detalle-footer-label">Total facturas a pagar</span>
                <strong className="mp-detalle-footer-amount">
                  ${Number(totalAmount).toLocaleString('es-CO')}
                </strong>
              </div>
              <div className="mp-detalle-footer-actions">
                <button className="mp-btn-agregar" onClick={() => setResultado(null)}>
                  + Agregar otra factura
                </button>
                <button className="mp-btn-autopago-footer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                  </svg>
                  Activar o actualizar tu pago autom...
                </button>
                <button className="mp-btn-pagar" onClick={() => setIsPaymentModalOpen(true)}>
                  Pagar
                </button>
              </div>
            </div>
          </div>
          );
        })()}
      </section>

      {/* ─── MEDIOS DE PAGO ─── */}
      <section className="mp-methods-section">
        <div className="mp-container mp-methods-inner">
          <h3 className="mp-methods-title">Pago 100% seguro con tus medios favoritos de pago</h3>
          <div className="mp-methods-logos">
            <img src={imgBancos} alt="Medios de pago" className="mp-bancos-img" />
          </div>
          <p className="mp-methods-note">
            Todas las transacciones y el procesamiento de tu información son gestionados por la plataforma de cobros online ePayco.
          </p>
        </div>
      </section>

      {/* ─── APP MI MOVISTAR ─── */}
      <section className="mp-app-section">
        <div className="mp-container">
          <h2 className="mp-section-title">Conoce más de la App Mi Movistar</h2>
          <div className="mp-cards-grid">

            {/* Card 1 - Consumos */}
            <div className="mp-card">
              <div className="mp-card-banner">
                <img src={imgIphone} alt="Consumos de tu plan" className="mp-card-img" />
              </div>
              <div className="mp-card-body">
                <span className="mp-card-tag">Consumos de tu plan</span>
                <h3 className="mp-card-title">Ten el control total</h3>
                <p className="mp-card-desc">¿No sabes en qué se van tus datos? En la app Mi Movistar puedes ver el detalle de tus consumos. ¡Aprovecha al máximo tu plan!</p>
                <button className="mp-card-btn">Descargar App</button>
              </div>
            </div>

            {/* Card 2 - Roaming */}
            <div className="mp-card">
              <div className="mp-card-banner">
                <img src={imgPersonaRoam} alt="Roaming" className="mp-card-img" />
              </div>
              <div className="mp-card-body">
                <span className="mp-card-tag">Roaming</span>
                <h3 className="mp-card-title">Actívalo desde donde estés</h3>
                <p className="mp-card-desc">En la app Mi Movistar puedes activar el roaming internacional al instante. Lleva la conexión contigo a cualquier parte</p>
                <button className="mp-card-btn">Conoce más</button>
              </div>
            </div>

            {/* Card 3 - Centros */}
            <div className="mp-card">
              <div className="mp-card-banner">
                <img src={imgRobot} alt="Centros de experiencia" className="mp-card-img" />
              </div>
              <div className="mp-card-body">
                <span className="mp-card-tag">Centros de experiencia</span>
                <h3 className="mp-card-title">Atención rápida, sin esperas</h3>
                <p className="mp-card-desc">Con la app Mi Movistar agenda tu cita en los Centros de Experiencia en segundos, te esperamos para darte la mejor atención</p>
                <button className="mp-card-btn">Agendar cita</button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mp-faq-section">
        <div className="mp-container mp-faq-inner">
          <h2 className="mp-section-title">Preguntas frecuentes</h2>
          <div className="mp-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`mp-faq-item ${openFaq === i ? 'mp-faq-item--open' : ''}`}>
                <button className="mp-faq-q" onClick={() => toggleFaq(i)}>
                  <span>{faq.q}</span>
                  <svg className="mp-faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="mp-faq-a">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEGURIDAD ─── */}
      <section className="mp-security-section">
        <div className="mp-container mp-security-inner">
          <h3 className="mp-security-title">Protegemos tu información de pago</h3>
          <div className="mp-security-badges">
            <img src={imgSelloMov} alt="Pago seguro Movistar" className="mp-security-img" />
            <div className="mp-badge-divider"></div>
            <img src={imgSSL} alt="SSL Secure" className="mp-security-img" />
            <div className="mp-badge-divider"></div>
            <img src={imgSIC} alt="Superintendencia de Industria y Comercio" className="mp-security-img" />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mp-footer">
        <div className="mp-container">
          <div className="mp-footer-top">
            <div className="mp-footer-logo">
              <img src={imgMovBlan} alt="Movistar" className="mp-footer-logo-img" />
            </div>
            <div className="mp-footer-copy-top">
              <h4>Medios de pago disponibles</h4>
              <p>Puedes realizar el pago de tu factura Movistar con tarjetas crédito y débito, PSE, Bre-B y billeteras digitales cómo Daviplata. Tu pago se verá reflejado inmediatamente.</p>
            </div>
          </div>

          <div className="mp-footer-divider"></div>

          <div className="mp-footer-bottom">
            <div className="mp-footer-brand">
              <span>Una marca</span>
              <img src={imgTelefonica} alt="Telefónica" className="mp-footer-telefonica-img" />
            </div>
            <p className="mp-footer-legal">© 2026 Movistar. Todos los derechos reservados</p>
          </div>
        </div>
      </footer>

      {/* ─── MODAL MEDIOS DE PAGO ─── */}
      {isPaymentModalOpen && (
        <div className="mp-modal-overlay">
          <div className="mp-modal-content">
            <button className="mp-modal-close" onClick={() => setIsPaymentModalOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="mp-modal-title">Selecciona tu medio de pago</h3>
            
            <div className="mp-payment-options">
              <label className={`mp-payment-option ${selectedPaymentMethod === 'pse' ? 'mp-payment-option--selected' : ''}`}>
                <div className="mp-payment-option-left">
                  <div className="mp-payment-icon-container">
                    <img src={imgPse} alt="PSE" className="mp-payment-icon" />
                  </div>
                  <span className="mp-payment-name">PSE</span>
                </div>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="pse" 
                  checked={selectedPaymentMethod === 'pse'}
                  onChange={() => setSelectedPaymentMethod('pse')}
                  className="mp-payment-radio"
                />
              </label>

              <label className={`mp-payment-option ${selectedPaymentMethod === 'breb' ? 'mp-payment-option--selected' : ''}`}>
                <div className="mp-payment-option-left">
                  <div className="mp-payment-icon-container">
                    <img src={imgBreB} alt="Bre-B" className="mp-payment-icon" />
                  </div>
                  <div className="mp-payment-name-wrapper">
                    <span className="mp-payment-name">Bre - B</span>
                    <span className="mp-payment-subtitle">Paga con tu llave</span>
                  </div>
                </div>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="breb" 
                  checked={selectedPaymentMethod === 'breb'}
                  onChange={() => setSelectedPaymentMethod('breb')}
                  className="mp-payment-radio"
                />
              </label>

              <label className={`mp-payment-option ${selectedPaymentMethod === 'otros' ? 'mp-payment-option--selected' : ''}`}>
                <div className="mp-payment-option-left">
                  <div className="mp-payment-icon-container">
                    <img src={imgOtroIcon} alt="Otros medios" className="mp-payment-icon" />
                  </div>
                  <span className="mp-payment-name">Otros medios de pago</span>
                </div>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="otros" 
                  checked={selectedPaymentMethod === 'otros'}
                  onChange={() => setSelectedPaymentMethod('otros')}
                  className="mp-payment-radio"
                />
              </label>
            </div>

            <button className="mp-modal-btn-continuar" onClick={handleContinuarPago}>
              Continuar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MovistarPaymentPortal;
