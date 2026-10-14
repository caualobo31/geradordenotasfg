# Etiqueta Certa

Aplicação web responsiva para criar etiquetas logísticas com prévia em tempo real, QR Code de localização e exportação em PDF no tamanho físico da etiqueta.

## Recursos

- identificação do destinatário por texto ou logomarca;
- logo padrão da Figueiredo Auto Peças aplicada automaticamente;
- preenchimento opcional de endereço pelo CEP com ViaCEP;
- QR Code que abre o endereço no Google Maps;
- uma página de PDF por volume;
- medidas da etiqueta configuráveis, com padrão de 100 × 150 mm para a Tomate MDK;
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

O PDF é criado em 100 × 150 mm por padrão. Na janela de impressão, selecione tamanho real (100%), sem margens e sem ajuste automático à página. Se o rolo instalado tiver outra medida, ajuste a largura e a altura na seção **Configuração da etiqueta** antes de gerar o arquivo.
