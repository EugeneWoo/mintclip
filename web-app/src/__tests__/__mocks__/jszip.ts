const JSZip = jest.fn().mockImplementation(() => ({
  file: jest.fn(),
  generateAsync: jest.fn().mockResolvedValue(new Blob(['mock zip content'], { type: 'application/zip' })),
}));

export default JSZip;
