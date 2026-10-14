import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import './styles.css';
import senderLogoUrl from './assets/figueiredo-logo.png';

type RecipientMode = 'text' | 'logo';

interface LabelState {
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderCep: string;
  senderPhone: string;
  carrier: string;
  recipientMode: RecipientMode;
  recipientName: string;
  recipientLogo: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  uf: string;
  receiver: string;
  document: string;
  weight: string;
  height: string;
  width: string;
  length: string;
  quantity: string;
  volumes: number;
  labelWidth: number;
  labelHeight: number;
}

const STORAGE_KEY = 'etiqueta-certa-draft-v2';

const defaults: LabelState = {
  senderName: 'Figueiredo Autopeças',
  senderAddress: 'Rua Desembargador Felinto Bastos, 1258 - Centro',
  senderCity: 'Feira de Santana - BA',
  senderCep: '44002-748',
  senderPhone: '(75) 98229-2867',
  carrier: 'Wilian Transportes',
  recipientMode: 'text',
  recipientName: '',
  recipientLogo: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  uf: '',
  receiver: '',
  document: '',
  weight: '',
  height: '',
  width: '',
  length: '',
  quantity: '1',
  volumes: 1,
  labelWidth: 100,
  labelHeight: 150,
};

function loadState(): LabelState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

let state = loadState();
let activeVolume = 1;
let qrDataUrl = '';
let renderToken = 0;

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.1V21"/></svg>
      </div>
      <div><strong>Etiqueta Certa</strong><span>Etiquetas logísticas sem complicação</span></div>
    </div>
    <div class="save-status"><span class="save-dot"></span><span id="saveText">Rascunho salvo</span></div>
  </header>

  <main class="workspace">
    <section class="editor-column" aria-label="Dados da etiqueta">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Nova etiqueta</p>
          <h1>Prepare o envio</h1>
          <p>Preencha os dados e confira o resultado em tempo real.</p>
        </div>
        <button class="icon-button reset-button" id="resetButton" type="button" title="Limpar formulário" aria-label="Limpar formulário">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/></svg>
        </button>
      </div>

      <form id="labelForm" novalidate>
        <section class="form-card">
          <div class="section-heading"><span>1</span><div><h2>Quem envia</h2><p>Dados do remetente e da transportadora</p></div></div>
          <div class="field-grid two">
            <label class="field"><span>Nome do remetente</span><input data-field="senderName" autocomplete="organization" /></label>
            <label class="field"><span>Transportadora</span><input data-field="carrier" /></label>
            <label class="field full"><span>Endereço do remetente</span><input data-field="senderAddress" autocomplete="street-address" /></label>
            <label class="field"><span>Cidade / UF</span><input data-field="senderCity" /></label>
            <label class="field"><span>CEP</span><input data-field="senderCep" inputmode="numeric" /></label>
            <label class="field"><span>Telefone</span><input data-field="senderPhone" inputmode="tel" /></label>
            <div class="fixed-logo-note full"><img src="${senderLogoUrl}" alt="Logo Figueiredo Auto Peças" /><span><strong>Logo padrão da loja</strong><small>Aplicada automaticamente na etiqueta</small></span></div>
          </div>
        </section>

        <section class="form-card">
          <div class="section-heading"><span>2</span><div><h2>Destinatário</h2><p>Identificação que aparece em destaque</p></div></div>
          <fieldset class="mode-fieldset">
            <legend>Como identificar?</legend>
            <div class="segmented">
              <label><input type="radio" name="recipientMode" value="text" /><span><svg viewBox="0 0 24 24"><path d="M5 6h14M12 6v13M8 19h8"/></svg>Nome em texto</span></label>
              <label><input type="radio" name="recipientMode" value="logo" /><span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 17 5-4 3 3 3-2 5 4"/></svg>Logomarca</span></label>
            </div>
          </fieldset>
          <div id="recipientTextFields">
            <label class="field"><span>Nome ou empresa <b>*</b></span><input data-field="recipientName" placeholder="Ex.: Supreme Proteção Veicular" required /></label>
          </div>
          <div id="recipientLogoFields" class="hidden">
            <label class="upload-field prominent">
              <span class="upload-icon">+</span><span><strong>Selecionar logomarca</strong><small>Use uma imagem com bom contraste</small></span>
              <input id="recipientLogoInput" type="file" accept="image/png,image/jpeg" />
            </label>
            <p class="file-name" id="recipientLogoName"></p>
          </div>
        </section>

        <section class="form-card">
          <div class="section-heading"><span>3</span><div><h2>Endereço de entrega</h2><p>Este endereço gera o QR Code automaticamente</p></div></div>
          <div class="field-grid address-grid">
            <label class="field cep-field"><span>CEP <em>(opcional)</em></span><div class="input-action"><input data-field="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" /><button id="cepButton" type="button">Buscar</button></div><small id="cepMessage"></small></label>
            <label class="field street-field"><span>Rua / Avenida <b>*</b></span><input data-field="street" autocomplete="address-line1" required /></label>
            <label class="field number-field"><span>Número <b>*</b></span><input data-field="number" required /></label>
            <label class="field complement-field"><span>Complemento</span><input data-field="complement" autocomplete="address-line2" /></label>
            <label class="field district-field"><span>Bairro</span><input data-field="district" /></label>
            <label class="field city-field"><span>Cidade <b>*</b></span><input data-field="city" autocomplete="address-level2" required /></label>
            <label class="field uf-field"><span>UF <b>*</b></span><input data-field="uf" maxlength="2" autocomplete="address-level1" required /></label>
          </div>
          <div class="map-card">
            <div class="map-icon"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></div>
            <div><strong>QR Code de localização</strong><span id="mapAddress">Preencha o endereço para gerar</span></div>
            <button id="mapButton" type="button" disabled>Ver no mapa <svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></button>
          </div>
        </section>

        <section class="form-card">
          <div class="section-heading"><span>4</span><div><h2>Dados da carga</h2><p>Informações de conferência e volumes</p></div></div>
          <div class="field-grid two">
            <label class="field"><span>Recebedor</span><input data-field="receiver" /></label>
            <label class="field"><span>Documento</span><input data-field="document" /></label>
          </div>
          <div class="field-grid metrics-grid">
            <label class="field suffix-field"><span>Peso</span><div><input data-field="weight" inputmode="decimal" /><em>kg</em></div></label>
            <label class="field suffix-field"><span>Altura</span><div><input data-field="height" inputmode="decimal" /><em>cm</em></div></label>
            <label class="field suffix-field"><span>Largura</span><div><input data-field="width" inputmode="decimal" /><em>cm</em></div></label>
            <label class="field suffix-field"><span>Comprimento</span><div><input data-field="length" inputmode="decimal" /><em>cm</em></div></label>
          </div>
          <div class="field-grid two">
            <label class="field"><span>Quantidade de itens</span><input data-field="quantity" inputmode="numeric" /></label>
            <label class="field"><span>Total de volumes <b>*</b></span><div class="stepper"><button type="button" id="volumeMinus" aria-label="Diminuir volumes">−</button><input data-field="volumes" inputmode="numeric" min="1" max="100" /><button type="button" id="volumePlus" aria-label="Aumentar volumes">+</button></div></label>
          </div>
        </section>

        <details class="settings-card">
          <summary><span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>Configuração da etiqueta</span><small>100 × 150 mm</small></summary>
          <div class="field-grid two settings-fields">
            <label class="field suffix-field"><span>Largura</span><div><input data-field="labelWidth" type="number" min="30" max="220" /><em>mm</em></div></label>
            <label class="field suffix-field"><span>Altura</span><div><input data-field="labelHeight" type="number" min="30" max="300" /><em>mm</em></div></label>
          </div>
          <p>Padrão 100 × 150 mm para etiqueta logística na Tomate MDK. Ao imprimir, use tamanho real (100%) e sem margens.</p>
        </details>

        <div class="desktop-actions">
          <button class="primary-button" id="pdfButton" type="submit"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg>Gerar PDF <span id="pdfVolumeLabel">1 etiqueta</span></button>
        </div>
      </form>
    </section>

    <aside class="preview-pane" id="previewPane" aria-label="Prévia da etiqueta">
      <div class="preview-header">
        <div><p class="eyebrow">Prévia em tempo real</p><h2>Sua etiqueta</h2></div>
        <button class="close-preview" id="closePreview" type="button" aria-label="Fechar prévia">×</button>
      </div>
      <div class="preview-stage">
        <div class="label-shell" id="labelPreview"></div>
      </div>
      <div class="volume-nav">
        <button id="prevVolume" type="button" aria-label="Volume anterior">←</button>
        <span>Volume <strong id="activeVolume">1</strong> de <strong id="totalVolumes">1</strong></span>
        <button id="nextVolume" type="button" aria-label="Próximo volume">→</button>
      </div>
      <div class="preview-note"><svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.3 4.4 2.7 17.6A1.6 1.6 0 0 0 4.1 20h15.8a1.6 1.6 0 0 0 1.4-2.4L13.7 4.4a2 2 0 0 0-3.4 0Z"/></svg><span>Imprima em <strong>tamanho real (100%)</strong> e sem margens.</span></div>
    </aside>
  </main>

  <div class="mobile-bar">
    <button class="secondary-button" id="openPreview" type="button"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>Ver prévia</button>
    <button class="primary-button" id="mobilePdfButton" type="button">Gerar PDF</button>
  </div>
  <div class="preview-backdrop" id="previewBackdrop"></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const form = document.querySelector<HTMLFormElement>('#labelForm')!;
const labelPreview = document.querySelector<HTMLDivElement>('#labelPreview')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
}

function getFullAddress(): string {
  const addressParts = [
    [state.street, state.number].filter(Boolean).join(', '),
    state.complement,
    state.district,
    [state.city, state.uf].filter(Boolean).join(' - '),
    state.cep ? `CEP ${state.cep}` : '',
  ].filter(Boolean);
  return addressParts.length ? [...addressParts, 'Brasil'].join(', ') : '';
}

function getMapUrl(): string {
  const address = getFullAddress();
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
}

function showToast(message: string, tone: 'success' | 'error' = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function saveDraft() {
  const saveText = document.querySelector('#saveText')!;
  saveText.textContent = 'Salvando…';
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.setTimeout(() => { saveText.textContent = 'Rascunho salvo'; }, 250);
  } catch {
    saveText.textContent = 'Rascunho muito grande';
  }
}

function recipientMarkup(): string {
  if (state.recipientMode === 'logo' && state.recipientLogo) {
    return `<img class="recipient-logo" src="${state.recipientLogo}" alt="Logomarca do destinatário" />`;
  }
  return `<strong class="recipient-name">${escapeHtml(state.recipientName || 'DESTINATÁRIO')}</strong>`;
}

function senderMark(): string {
  return `<img class="sender-logo" src="${senderLogoUrl}" alt="Logo Figueiredo Auto Peças" />`;
}

async function updatePreview() {
  const token = ++renderToken;
  const mapUrl = getMapUrl();
  try {
    qrDataUrl = mapUrl ? await QRCode.toDataURL(mapUrl, { width: 360, margin: 2, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'M' }) : '';
  } catch {
    qrDataUrl = '';
  }
  if (token !== renderToken) return;

  const address = getFullAddress();
  labelPreview.style.setProperty('--label-ratio', `${state.labelWidth} / ${state.labelHeight}`);
  labelPreview.innerHTML = `
    <div class="paper-label">
      <div class="paper-top">
        <div class="paper-sender">
          ${senderMark()}
          <div><b>REMETENTE</b><strong>${escapeHtml(state.senderName || 'Nome do remetente')}</strong><span>${escapeHtml(state.senderAddress || 'Endereço do remetente')}</span><span>${escapeHtml(state.senderCity)}</span><span>${escapeHtml([state.senderCep && `CEP ${state.senderCep}`, state.senderPhone && `Tel. ${state.senderPhone}`].filter(Boolean).join(' · '))}</span></div>
        </div>
        <div class="paper-right">
          <div class="paper-carrier"><b>TRANSPORTADORA</b><strong>${escapeHtml(state.carrier || 'Não informada')}</strong></div>
          <div class="paper-recipient"><b>DESTINATÁRIO</b>${recipientMarkup()}</div>
        </div>
      </div>
      <div class="paper-data">
        <div class="paper-line"><span>Recebedor: <i>${escapeHtml(state.receiver)}</i></span><span>DOC: <i>${escapeHtml(state.document)}</i></span></div>
        <div class="paper-metrics">
          <span><b>Peso</b>${escapeHtml(state.weight || '—')} kg</span>
          <span><b>Alt.</b>${escapeHtml(state.height || '—')} cm</span>
          <span><b>Larg.</b>${escapeHtml(state.width || '—')} cm</span>
          <span><b>Comp.</b>${escapeHtml(state.length || '—')} cm</span>
        </div>
        <div class="paper-quantity"><span>Quantidade: <strong>${escapeHtml(state.quantity || '—')}</strong></span><strong>VOLUME ${activeVolume} DE ${state.volumes}</strong></div>
      </div>
      <div class="paper-location">
        <b>IDENTIFICAÇÃO DO DESTINATÁRIO</b>
        <div class="paper-address">${escapeHtml(address || 'Endereço aguardando preenchimento')}</div>
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code da localização" />` : `<div class="qr-placeholder"><span>QR</span><small>Preencha o endereço</small></div>`}
        <small class="scan-label">ESCANEIE PARA ABRIR NO MAPA</small>
      </div>
    </div>
  `;

  document.querySelector('#activeVolume')!.textContent = String(activeVolume);
  document.querySelector('#totalVolumes')!.textContent = String(state.volumes);
  document.querySelector('#pdfVolumeLabel')!.textContent = state.volumes === 1 ? '1 etiqueta' : `${state.volumes} etiquetas`;
  const mapAddress = document.querySelector('#mapAddress')!;
  mapAddress.textContent = address || 'Preencha o endereço para gerar';
  const mapButton = document.querySelector<HTMLButtonElement>('#mapButton')!;
  mapButton.disabled = !address;
  document.querySelector('.settings-card summary small')!.textContent = `${state.labelWidth} × ${state.labelHeight} mm`;
  updateVolumeButtons();
}

function updateVolumeButtons() {
  const prev = document.querySelector<HTMLButtonElement>('#prevVolume')!;
  const next = document.querySelector<HTMLButtonElement>('#nextVolume')!;
  prev.disabled = activeVolume <= 1;
  next.disabled = activeVolume >= state.volumes;
}

function populateForm() {
  document.querySelectorAll<HTMLInputElement>('[data-field]').forEach((input) => {
    const key = input.dataset.field as keyof LabelState;
    input.value = String(state[key] ?? '');
  });
  document.querySelectorAll<HTMLInputElement>('input[name="recipientMode"]').forEach((radio) => {
    radio.checked = radio.value === state.recipientMode;
  });
  toggleRecipientMode();
}

function toggleRecipientMode() {
  document.querySelector('#recipientTextFields')!.classList.toggle('hidden', state.recipientMode !== 'text');
  document.querySelector('#recipientLogoFields')!.classList.toggle('hidden', state.recipientMode !== 'logo');
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

async function lookupCep() {
  const digits = state.cep.replace(/\D/g, '');
  const message = document.querySelector<HTMLElement>('#cepMessage')!;
  if (digits.length !== 8) {
    message.textContent = 'Digite os 8 números do CEP.';
    message.className = 'error-text';
    return;
  }
  message.textContent = 'Buscando endereço…';
  message.className = '';
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) throw new Error('Falha na busca');
    const data = await response.json();
    if (data.erro) throw new Error('CEP não encontrado');
    state.street = data.logradouro || state.street;
    state.district = data.bairro || state.district;
    state.city = data.localidade || state.city;
    state.uf = data.uf || state.uf;
    populateForm();
    saveDraft();
    await updatePreview();
    message.textContent = 'Endereço encontrado. Confira o número.';
    message.className = 'success-text';
    document.querySelector<HTMLInputElement>('[data-field="number"]')?.focus();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : 'Não foi possível consultar o CEP.';
    message.className = 'error-text';
  }
}

function readImage(file: File) {
  if (file.size > 4 * 1024 * 1024) {
    showToast('Use uma imagem de até 4 MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    state.recipientLogo = String(reader.result || '');
    document.querySelector('#recipientLogoName')!.textContent = file.name;
    saveDraft();
    await updatePreview();
  };
  reader.readAsDataURL(file);
}

function validateBeforePdf(): boolean {
  const missing: string[] = [];
  if (state.recipientMode === 'text' && !state.recipientName.trim()) missing.push('nome do destinatário');
  if (state.recipientMode === 'logo' && !state.recipientLogo) missing.push('logomarca do destinatário');
  if (!state.street.trim()) missing.push('rua');
  if (!state.number.trim()) missing.push('número');
  if (!state.city.trim()) missing.push('cidade');
  if (!state.uf.trim()) missing.push('UF');
  if (missing.length) {
    showToast(`Preencha: ${missing.join(', ')}.`, 'error');
    return false;
  }
  return true;
}

const MM_TO_PT = 72 / 25.4;

function pdfSafe(text: string): string {
  return text.replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function wrapPdfText(text: string, font: PDFFont, size: number, maxWidthMm: number): string[] {
  const maxWidth = maxWidthMm * MM_TO_PT;
  const paragraphs = pdfSafe(text || '').split(/\n/);
  const lines: string[] = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    let current = words[0];
    words.slice(1).forEach((word) => {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else { lines.push(current); current = word; }
    });
    lines.push(current);
  });
  return lines;
}

function pdfY(pageHeightMm: number, topMm: number, fontSize = 0): number {
  return (pageHeightMm - topMm) * MM_TO_PT - fontSize * 0.82;
}

function drawPdfText(page: PDFPage, text: string, xMm: number, topMm: number, size: number, font: PDFFont) {
  page.drawText(pdfSafe(text), { x: xMm * MM_TO_PT, y: pdfY(state.labelHeight, topMm, size), size, font, color: rgb(0, 0, 0) });
}

function drawPdfLines(page: PDFPage, lines: string[], xMm: number, topMm: number, size: number, font: PDFFont, lineHeightMm = 3.2) {
  lines.forEach((line, index) => drawPdfText(page, line, xMm, topMm + index * lineHeightMm, size, font));
}

async function embedDataImage(pdf: PDFDocument, dataUrl: string) {
  const bytes = await fetch(dataUrl).then((response) => response.arrayBuffer());
  return dataUrl.startsWith('data:image/jpeg') ? pdf.embedJpg(bytes) : pdf.embedPng(bytes);
}

function drawTopImage(page: PDFPage, image: Awaited<ReturnType<typeof embedDataImage>>, xMm: number, topMm: number, widthMm: number, heightMm: number) {
  page.drawImage(image, {
    x: xMm * MM_TO_PT,
    y: (state.labelHeight - topMm - heightMm) * MM_TO_PT,
    width: widthMm * MM_TO_PT,
    height: heightMm * MM_TO_PT,
  });
}

async function drawPdfPage(pdf: PDFDocument, page: PDFPage, regular: PDFFont, bold: PDFFont, volume: number, mapQr: string) {
  const w = state.labelWidth;
  const h = state.labelHeight;
  const margin = 2.2;
  const topH = h * 0.29;
  const dataH = h * 0.22;
  const locationY = margin + topH + dataH;
  const dividerX = w * 0.53;
  const line = (x1: number, y1: number, x2: number, y2: number) => page.drawLine({
    start: { x: x1 * MM_TO_PT, y: (h - y1) * MM_TO_PT },
    end: { x: x2 * MM_TO_PT, y: (h - y2) * MM_TO_PT },
    thickness: 0.42 * MM_TO_PT,
    color: rgb(0, 0, 0),
  });
  page.drawRectangle({ x: margin * MM_TO_PT, y: margin * MM_TO_PT, width: (w - margin * 2) * MM_TO_PT, height: (h - margin * 2) * MM_TO_PT, borderColor: rgb(0, 0, 0), borderWidth: 0.42 * MM_TO_PT });
  line(margin, margin + topH, w - margin, margin + topH);
  line(margin, locationY, w - margin, locationY);
  line(dividerX, margin, dividerX, margin + topH);
  line(dividerX, margin + topH * 0.43, w - margin, margin + topH * 0.43);

  drawPdfText(page, 'REMETENTE', margin + 2, margin + 2.4, 6.2, bold);
  const senderTextX = margin + 2;
  let senderY = margin + 8;
  try {
    const logo = await embedDataImage(pdf, senderLogoUrl);
    drawTopImage(page, logo, senderTextX, senderY, 13, 13);
    senderY += 14;
  } catch { /* keeps sender text visible if the asset cannot be embedded */ }
  drawPdfLines(page, wrapPdfText(state.senderName, bold, 8.4, dividerX - margin - 4), senderTextX, senderY, 8.4, bold, 3.8);
  senderY += 6.5;
  const senderLines = [state.senderAddress, state.senderCity, [state.senderCep && `CEP ${state.senderCep}`, state.senderPhone && `Tel. ${state.senderPhone}`].filter(Boolean).join(' | ')].filter(Boolean);
  senderLines.forEach((senderLine) => {
    const wrapped = wrapPdfText(senderLine, bold, 6.4, dividerX - margin - 4);
    drawPdfLines(page, wrapped, senderTextX, senderY, 6.4, bold, 3);
    senderY += Math.max(1, wrapped.length) * 3;
  });

  const rightX = dividerX + 2;
  const rightW = w - margin - rightX - 1;
  drawPdfText(page, 'TRANSPORTADORA', rightX, margin + 2.4, 5.8, bold);
  drawPdfLines(page, wrapPdfText(state.carrier, bold, 7, rightW), rightX, margin + 8, 7, bold, 3.2);
  const recY = margin + topH * 0.43 + 4;
  drawPdfText(page, 'DESTINATÁRIO', rightX, recY - 1.2, 5.8, bold);
  if (state.recipientMode === 'logo' && state.recipientLogo) {
    try {
      const logo = await embedDataImage(pdf, state.recipientLogo);
      drawTopImage(page, logo, rightX, recY + 2, rightW, topH * 0.48 - 5);
    } catch { /* text fallback below */ }
  } else {
    drawPdfLines(page, wrapPdfText(state.recipientName.toUpperCase(), bold, 9.5, rightW), rightX, recY + 4.5, 9.5, bold, 4.2);
  }

  const dataY = margin + topH;
  drawPdfText(page, `Recebedor: ${state.receiver || '________________'}`, margin + 2, dataY + 4, 5.5, regular);
  drawPdfText(page, `DOC: ${state.document || '____________'}`, w * 0.57, dataY + 4, 5.5, regular);
  const metrics = [`Peso: ${state.weight || '-'} kg`, `Alt.: ${state.height || '-'} cm`, `Larg.: ${state.width || '-'} cm`, `Comp.: ${state.length || '-'} cm`];
  metrics.forEach((item, index) => drawPdfText(page, item, margin + 2 + index * ((w - margin * 2 - 4) / 4), dataY + 13, 5.1, regular));
  drawPdfText(page, `Quantidade: ${state.quantity || '-'}`, margin + 2, dataY + 22, 5.5, regular);
  drawPdfText(page, `VOLUME ${volume} DE ${state.volumes}`, margin + 2, dataY + dataH - 6, 7.2, bold);

  drawPdfText(page, 'IDENTIFICAÇÃO DO DESTINATÁRIO', margin + 2, locationY + 3, 5.8, bold);
  const addressLines = wrapPdfText(getFullAddress(), regular, 5.2, w - margin * 2 - 5).slice(0, 3);
  drawPdfLines(page, addressLines, margin + 2, locationY + 8, 5.2, regular, 2.6);
  const qrSize = Math.min(w * 0.53, h - locationY - 23);
  const qrX = (w - qrSize) / 2;
  const qrY = locationY + 17;
  const qrImage = await embedDataImage(pdf, mapQr);
  drawTopImage(page, qrImage, qrX, qrY, qrSize, qrSize);
  const scanText = 'ESCANEIE PARA ABRIR NO MAPA';
  const scanWidthMm = bold.widthOfTextAtSize(scanText, 5.2) / MM_TO_PT;
  drawPdfText(page, scanText, (w - scanWidthMm) / 2, Math.min(h - margin - 4, qrY + qrSize + 3), 5.2, bold);
}

async function generatePdf() {
  if (!validateBeforePdf()) return;
  const pdfButton = document.querySelector<HTMLButtonElement>('#pdfButton')!;
  const mobileButton = document.querySelector<HTMLButtonElement>('#mobilePdfButton')!;
  pdfButton.disabled = true;
  mobileButton.disabled = true;
  const oldText = mobileButton.textContent;
  mobileButton.textContent = 'Gerando…';
  try {
    const mapUrl = getMapUrl();
    const mapQr = await QRCode.toDataURL(mapUrl, { width: 900, margin: 2, errorCorrectionLevel: 'M' });
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (let volume = 1; volume <= state.volumes; volume += 1) {
      const page = pdf.addPage([state.labelWidth * MM_TO_PT, state.labelHeight * MM_TO_PT]);
      await drawPdfPage(pdf, page, regular, bold, volume, mapQr);
    }
    const safeName = (state.recipientName || 'destinatario').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    const bytes = await pdf.save({ useObjectStreams: true });
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `etiquetas-${safeName || 'envio'}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    showToast(state.volumes === 1 ? 'PDF gerado com sucesso.' : `${state.volumes} etiquetas geradas no PDF.`);
  } catch (error) {
    console.error(error);
    showToast('Não foi possível gerar o PDF. Tente novamente.', 'error');
  } finally {
    pdfButton.disabled = false;
    mobileButton.disabled = false;
    mobileButton.textContent = oldText;
  }
}

form.addEventListener('input', async (event) => {
  const input = event.target as HTMLInputElement;
  const key = input.dataset.field as keyof LabelState | undefined;
  if (!key) return;
  if (key === 'volumes') {
    state.volumes = Math.max(1, Math.min(100, Number(input.value) || 1));
    activeVolume = Math.min(activeVolume, state.volumes);
  } else if (key === 'labelWidth' || key === 'labelHeight') {
    state[key] = Math.max(30, Number(input.value) || defaults[key]);
  } else if (key === 'cep' || key === 'senderCep') {
    const formatted = formatCep(input.value);
    input.value = formatted;
    (state[key] as string) = formatted;
  } else if (key === 'uf') {
    input.value = input.value.toUpperCase().slice(0, 2);
    state.uf = input.value;
  } else {
    (state[key] as string) = input.value;
  }
  saveDraft();
  await updatePreview();
});

form.addEventListener('submit', (event) => { event.preventDefault(); void generatePdf(); });

document.querySelectorAll<HTMLInputElement>('input[name="recipientMode"]').forEach((radio) => {
  radio.addEventListener('change', async () => {
    state.recipientMode = radio.value as RecipientMode;
    toggleRecipientMode();
    saveDraft();
    await updatePreview();
  });
});

document.querySelector<HTMLInputElement>('#recipientLogoInput')!.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) readImage(file);
});

document.querySelector('#cepButton')!.addEventListener('click', () => void lookupCep());
document.querySelector<HTMLInputElement>('[data-field="cep"]')!.addEventListener('blur', () => {
  if (state.cep.replace(/\D/g, '').length === 8 && !state.street) void lookupCep();
});
document.querySelector('#mapButton')!.addEventListener('click', () => {
  const url = getMapUrl();
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
});

document.querySelector('#volumeMinus')!.addEventListener('click', async () => {
  state.volumes = Math.max(1, state.volumes - 1); activeVolume = Math.min(activeVolume, state.volumes); populateForm(); saveDraft(); await updatePreview();
});
document.querySelector('#volumePlus')!.addEventListener('click', async () => {
  state.volumes = Math.min(100, state.volumes + 1); populateForm(); saveDraft(); await updatePreview();
});
document.querySelector('#prevVolume')!.addEventListener('click', async () => { activeVolume = Math.max(1, activeVolume - 1); await updatePreview(); });
document.querySelector('#nextVolume')!.addEventListener('click', async () => { activeVolume = Math.min(state.volumes, activeVolume + 1); await updatePreview(); });

document.querySelector('#resetButton')!.addEventListener('click', async () => {
  if (!window.confirm('Limpar os dados desta etiqueta e começar novamente?')) return;
  state = { ...defaults };
  activeVolume = 1;
  localStorage.removeItem(STORAGE_KEY);
  populateForm();
  await updatePreview();
  showToast('Formulário reiniciado.');
});

const previewPane = document.querySelector('#previewPane')!;
const previewBackdrop = document.querySelector('#previewBackdrop')!;
function setMobilePreview(open: boolean) {
  previewPane.classList.toggle('mobile-open', open);
  previewBackdrop.classList.toggle('show', open);
  document.body.classList.toggle('preview-is-open', open);
}
document.querySelector('#openPreview')!.addEventListener('click', () => setMobilePreview(true));
document.querySelector('#closePreview')!.addEventListener('click', () => setMobilePreview(false));
previewBackdrop.addEventListener('click', () => setMobilePreview(false));
document.querySelector('#mobilePdfButton')!.addEventListener('click', () => void generatePdf());

populateForm();
void updatePreview();
