import React, { useState } from "react";
import "./CheckoutCobre.css";

const CheckoutCobre = ({ amount = 153380 }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Estados para los selects
  const [selectedBank, setSelectedBank] = useState({
    name: "Bancolombia",
    code: "bancoBancolombia",
    logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1507.svg"
  });

  const [selectedDocType, setSelectedDocType] = useState("Cédula de Ciudadanía");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [showDocDropdown, setShowDocDropdown] = useState(false);

  const formattedAmount = `$${Number(amount).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;

  // Lista de bancos según tus carpetas (imagen 2)
  const banks = [
    { name: "AV Villas", code: "bancoAvVillas", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1052.svg" },
    { name: "Bancolombia", code: "bancoBancolombia", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1507.svg" },
    { name: "BBVA Colombia", code: "bancoBbvaColombia", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1480.svg" },
    { name: "Banco de Bogotá", code: "bancoBogota", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1281.svg" },
    { name: "Banco Caja Social", code: "bancoCajaSocial", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1283.svg" },
    { name: "Colpatria", code: "bancoColpatria", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1370.svg" },
    { name: "Davivienda", code: "bancoDavivienda", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1551.svg" },
    { name: "Banco Falabella", code: "bancoFalabella", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1706.svg" },
    { name: "Itaú", code: "bancoItau", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1286.svg" },
    { name: "Nequi", code: "bancoNequi", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1507.svg" },
    { name: "Banco de Occidente", code: "bancoOccidente", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1289.svg" },
    { name: "Banco Popular", code: "bancoPopular", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1552.svg" },
    { name: "Banco Serfinanza", code: "bancoSerfinanza", logo: "https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/banks/PR_COL_1801.svg" },
  ];

  // Tipos de documento según imagen 1
  const documentTypes = [
    "Cédula de Ciudadanía",
    "Cédula de Extranjería",
    "Pasaporte",
    "NIT",
    "Tarjeta de Identidad",
    "Permiso por Protección Temporal"
  ];

  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setShowBankDropdown(false);
  };

  const handleDocSelect = (doc) => {
    setSelectedDocType(doc);
    setShowDocDropdown(false);
  };

  return (
    <section className="checkout-wrapper">
      <section className="checkout-row">
        {/* LEFT / FORM */}
        <section className="checkout-form-col">
          {/* Mobile header bar */}
          <div className="mobile-header-bar" />

          {/* Mobile summary card */}
          <article className="mobile-summary-card">
            <figure className="mobile-summary-logo">
              <img
                src="https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/brands/cobreLogo.svg"
                alt="QR"
              />
            </figure>
            <div className="mobile-summary-info">
              <p className="mobile-summary-title">Recaudo Movistar</p>
              <p className="mobile-summary-amount">{formattedAmount}</p>
            </div>
          </article>

          {/* Form container */}
          <section className="form-container">
            <h2 className="form-main-title">Movistar PSE</h2>

            {/* Payment info */}
            <section className="form-section">
              <p className="form-section-title">Información del pago</p>
              <div className="payment-methods-box">
                <div className="payment-method-item">
                  <div className="radio-wrap">
                    <input
                      id="co-radio-r2p_pse"
                      name="paymentMethod"
                      defaultChecked
                      type="radio"
                      className="co-radio-input"
                      value="r2p_pse"
                      readOnly
                    />
                  </div>
                  <img
                    src="https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/payment-methods/pse.svg"
                    width="16"
                    height="16"
                    alt="PSE"
                    className="payment-logo"
                  />
                  <p className="payment-label">PSE</p>
                </div>

                {/* SELECT BANCOS */}
                <div className="field-wrap">
                  <label className="co-input-label">Entidad financiera</label>
                  <div className="co-select">
                    <div
                      className="co-select-toggle"
                      onClick={() => setShowBankDropdown(!showBankDropdown)}
                    >
                      <div className="co-select-selected">
                        <img
                          src={selectedBank.logo}
                          width="16"
                          height="16"
                          alt={selectedBank.name}
                          className="bank-logo"
                        />
                        <span>{selectedBank.name}</span>
                      </div>
                      <span className="co-select-arrow icon-chevron-down">
                        {showBankDropdown ? "▲" : "▼"}
                      </span>
                    </div>

                    {showBankDropdown && (
                      <div className="co-select-dropdown">
                        {banks.map((bank) => (
                          <div
                            key={bank.code}
                            className={`co-select-option ${selectedBank.code === bank.code ? 'selected' : ''}`}
                            onClick={() => handleBankSelect(bank)}
                          >
                            <img
                              src={bank.logo}
                              width="16"
                              height="16"
                              alt={bank.name}
                              className="bank-logo"
                            />
                            <span>{bank.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Personal info */}
            <section className="form-section">
              <p className="form-section-title">Información personal</p>
              <form className="personal-form row-g3">
                {/* Nombre */}
                <div className="form-field col-12">
                  <label className="co-input-label">Nombre</label>
                  <div className="co-input-wrap">
                    <input
                      id="counterparty_fullname"
                      placeholder="Ej. Juan Pérez"
                      className="co-input"
                      defaultValue=""
                    />
                  </div>
                  <div className="co-input-error" style={{ display: 'none' }}>
                    <span className="icon-alert-circle">⚠</span>
                    <p>Este campo es requerido</p>
                  </div>
                </div>

                {/* Tipo documento - SELECT FUNCIONAL */}
                <div className="form-field col-12">
                  <label className="co-input-label">Tipo de documento</label>
                  <div className="co-select">
                    <div
                      className="co-select-toggle"
                      onClick={() => setShowDocDropdown(!showDocDropdown)}
                    >
                      <div className="co-select-selected">
                        <span>{selectedDocType}</span>
                      </div>
                      <span className="co-select-arrow icon-chevron-down">
                        {showDocDropdown ? "▲" : "▼"}
                      </span>
                    </div>

                    {showDocDropdown && (
                      <div className="co-select-dropdown">
                        {documentTypes.map((doc) => (
                          <div
                            key={doc}
                            className={`co-select-option ${selectedDocType === doc ? 'selected' : ''}`}
                            onClick={() => handleDocSelect(doc)}
                          >
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Número documento */}
                <div className="form-field col-12">
                  <label className="co-input-label">Número de documento</label>
                  <div className="co-input-wrap">
                    <input
                      id="counterparty_id_number"
                      className="co-input"
                      defaultValue=""
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div className="form-field col-12">
                  <label className="co-input-label">Número de teléfono</label>
                  <div className="phone-input-wrap">
                    <div className="phone-indicative">
                      <img
                        src="https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/flags/col.svg"
                        width="16"
                        height="12"
                        alt="col"
                      />
                      <span className="indicative-label">+57</span>
                      <span className="co-select-arrow icon-chevron-down">▼</span>
                      <div className="indicative-divider" />
                    </div>
                    <input
                      id="counterparty_phone"
                      placeholder="(000) 000 0000"
                      className="co-input phone-input"
                      defaultValue=""
                    />
                  </div>
                </div>

                {/* Correo */}
                <div className="form-field col-12">
                  <label className="co-input-label">Correo electrónico</label>
                  <div className="co-input-wrap">
                    <input
                      id="counterparty_email"
                      placeholder="Ej. correo@ejemplo.com"
                      className="co-input"
                      defaultValue=""
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div className="form-field col-12">
                  <div className="label-row">
                    <label className="co-input-label">Dirección</label>
                    <span className="optional-label">(Opcional)</span>
                  </div>
                  <div className="co-input-wrap">
                    <input
                      id="counterparty_address"
                      placeholder="Ej. Cra 00 # 0 - 0"
                      className="co-input"
                      defaultValue=""
                    />
                  </div>
                </div>
              </form>
            </section>

            {/* Desktop submit */}
            <div className="desktop-submit-wrap">
              <button className="co-btn co-btn--primary" type="button">
                Pagar
              </button>
            </div>
          </section>
        </section>

        {/* RIGHT / SUMMARY */}
        <section className="checkout-summary-col">
          {/* Mobile sticky bottom */}
          <div className="mobile-summary-bar">
            <div className="mobile-summary-toggle">
              <p className="mobile-summary-toggle-text">Mostrar detalles</p>
              <button
                className="co-btn-icon"
                onClick={() => setShowDetails(!showDetails)}
                type="button"
              >
                {showDetails ? "▲" : "▼"}
              </button>
            </div>

            {showDetails && (
              <aside className="mobile-details">
                <p className="details-title">Detalle del pago</p>
                <div className="details-row">
                  <p className="details-concept">Recaudo Movistar</p>
                  <p className="details-amount">{formattedAmount}</p>
                </div>
                <div className="details-row details-total-row">
                  <p className="details-total-label">Total a pagar</p>
                  <p className="details-total-amount">{formattedAmount}</p>
                </div>
              </aside>
            )}

            <button className="co-btn co-btn--primary co-btn--full" type="button">
              Pagar {formattedAmount}
            </button>
          </div>

          {/* Desktop summary panel */}
          <div className="desktop-summary-panel">
            <article className="desktop-summary-card">
              <div className="desktop-summary-header">
                <figure>
                  <img
                    src="https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/brands/cobreLogo.svg"
                    alt="QR"
                    className="desktop-summary-qr"
                  />
                </figure>
                <p className="desktop-summary-title">Detalle del pago</p>
              </div>

              <div className="desktop-summary-body">
                <div className="summary-line">
                  <p className="summary-label">Recaudo Movistar</p>
                  <p className="summary-value">{formattedAmount}</p>
                </div>
                <div className="summary-line summary-line-total">
                  <p className="summary-total-label">Total a pagar</p>
                  <p className="summary-total-value">{formattedAmount}</p>
                </div>
              </div>

              <footer className="desktop-summary-footer">
                <p className="powered-label">Powered by</p>
                <img
                  src="https://cobre-portal-static-assets-prod.s3.us-east-1.amazonaws.com/logos/brands/cobreLogo.svg"
                  width="58"
                  height="12"
                  alt="Cobre"
                />
              </footer>
            </article>
          </div>
        </section>
      </section>
    </section>
  );
};

export default CheckoutCobre;