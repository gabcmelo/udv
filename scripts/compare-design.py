from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
source = Image.open(root / 'design/preview-native-windows.png').convert('RGB')
actual = Image.open(root / 'test-results/popup-native.png').convert('RGB')
canvas = Image.new('RGB', (source.width + actual.width + 36, max(source.height, actual.height) + 45), '#101114')
draw = ImageDraw.Draw(canvas)
draw.text((10, 10), 'Referencia aprovada', fill='white')
draw.text((source.width + 26, 10), 'Implementacao + aviso de demonstracao', fill='white')
canvas.paste(source, (8, 34))
canvas.paste(actual, (source.width + 28, 34))
canvas.save(root / 'test-results/design-comparison.png')
print(f'Referencia {source.size}; implementacao {actual.size}; escala 1:1, sem redimensionar.')
