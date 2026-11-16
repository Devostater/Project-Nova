from pathlib import Path
BASE = Path(__file__).parent

def generate_portrait(name):
    with open(BASE / f'{name}_portrait.txt', 'w') as f:
        f.write(f'Generated portrait for {name}')

generate_portrait('CaptainNova')