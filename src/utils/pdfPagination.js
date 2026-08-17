export const A4 = Object.freeze({ portrait: [210, 297], landscape: [297, 210] });

const rowIsBlank = (context, width, y) => {
  const pixels = context.getImageData(0, y, width, 1).data;
  let nonWhite = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] > 8 && (pixels[index] < 247 || pixels[index + 1] < 247 || pixels[index + 2] < 247)) nonWhite += 1;
  }
  return nonWhite / width < 0.006;
};

const contentBottom = (canvas) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  for (let y = canvas.height - 1; y > 0; y -= 1) {
    if (!rowIsBlank(context, canvas.width, y)) return Math.min(canvas.height, y + 2);
  }
  return canvas.height;
};

const safePageEnd = (canvas, start, idealEnd, contentEnd) => {
  if (idealEnd >= contentEnd) return contentEnd;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const search = Math.round((idealEnd - start) * 0.12);
  for (let y = idealEnd; y >= Math.max(start + 1, idealEnd - search); y -= 1) {
    if (rowIsBlank(context, canvas.width, y) && rowIsBlank(context, canvas.width, Math.max(start, y - 2))) return y;
  }
  return idealEnd;
};

export const addCanvasToA4Pdf = ({
  canvas,
  pdf,
  orientation = 'portrait',
  margin = 0,
  addFirstPage = false
}) => {
  const [pageWidth, pageHeight] = A4[orientation];
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);
  const pixelsPerPage = Math.floor(canvas.width * contentHeight / contentWidth);
  const end = contentBottom(canvas);
  let start = 0;
  let page = 0;

  while (start < end) {
    const sliceEnd = safePageEnd(canvas, start, start + pixelsPerPage, end);
    const sliceHeight = Math.max(1, sliceEnd - start);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    pageCanvas.getContext('2d').drawImage(canvas, 0, start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0 || addFirstPage) pdf.addPage('a4', orientation === 'landscape' ? 'l' : 'p');
    pdf.addImage(
      pageCanvas.toDataURL('image/png'),
      'PNG',
      margin,
      margin,
      contentWidth,
      sliceHeight * contentWidth / canvas.width
    );
    page += 1;
    start = sliceEnd;
  }

  return page;
};
