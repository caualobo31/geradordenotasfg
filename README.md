# Etiqueta Certa

Aplicação web responsiva para criar etiquetas logísticas com prévia em tempo real, QR Code de localização e exportação em PDF no tamanho físico da etiqueta.

## Recursos

- identificação do destinatário por texto ou logomarca;
- preenchimento de endereço pelo CEP com ViaCEP;
- QR Code que abre o endereço no Google Maps;
- uma página de PDF por volume;
- medidas da etiqueta configuráveis, com padrão provisório de 70 × 140 mm;
- rascunho salvo automaticamente no navegador;
- layout otimizado para computador e celular;
- geração do PDF inteiramente no navegador.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Verificação e build

```bash
npm run check
npm run build
```

Os arquivos finais são gerados em `dist/`.

## Publicação na Vercel

Importe o repositório como um projeto Vite. A Vercel pode usar automaticamente:

- comando de build: `npm run build`;
- diretório de saída: `dist`.

## Impressão

Confirme o tamanho físico da mídia e o modelo da impressora antes do uso definitivo. Na janela de impressão, selecione tamanho real (100%), sem margens e sem ajuste automático à página.
