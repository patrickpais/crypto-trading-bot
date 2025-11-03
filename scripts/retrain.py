#!/usr/bin/env python3
"""
Script para retreinamento de modelos de IA
Pode ser executado manualmente ou via agendamento
"""

import os
import sys
import json
from datetime import datetime
import subprocess

PROJECT_DIR = os.path.dirname(os.path.dirname(__file__))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, 'scripts')

def run_command(cmd, description):
    """Executa comando e mostra progresso"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"✗ Erro: {result.stderr}")
        return False
    
    print(result.stdout)
    print(f"✓ {description} concluído!")
    return True

def retrain_all(update_data=False):
    """
    Retreina todos os modelos
    
    Args:
        update_data: Se True, atualiza dados antes de retreinar
    """
    print(f"\n{'#'*60}")
    print(f"RETREINAMENTO DE MODELOS - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}")
    
    steps = []
    
    if update_data:
        steps.append({
            'cmd': f'python3 {os.path.join(SCRIPTS_DIR, "update_data.py")}',
            'desc': 'Atualizando dados das últimas 24h'
        })
    
    steps.extend([
        {
            'cmd': f'python3 {os.path.join(SCRIPTS_DIR, "prepare_training_data.py")}',
            'desc': 'Preparando dados de treinamento'
        },
        {
            'cmd': f'python3 {os.path.join(SCRIPTS_DIR, "train_model.py")}',
            'desc': 'Treinando modelos de IA'
        }
    ])
    
    results = []
    for step in steps:
        success = run_command(step['cmd'], step['desc'])
        results.append({
            'step': step['desc'],
            'success': success,
            'timestamp': datetime.now().isoformat()
        })
        
        if not success:
            print(f"\n✗ Retreinamento falhou na etapa: {step['desc']}")
            break
    
    # Salvar log do retreinamento
    log_file = os.path.join(PROJECT_DIR, 'retrain_log.json')
    
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'update_data': update_data,
        'steps': results,
        'success': all(r['success'] for r in results)
    }
    
    # Carregar logs existentes
    logs = []
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            try:
                logs = json.load(f)
            except:
                logs = []
    
    logs.append(log_entry)
    
    # Manter apenas últimos 50 logs
    logs = logs[-50:]
    
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)
    
    if log_entry['success']:
        print(f"\n{'#'*60}")
        print("✓ RETREINAMENTO CONCLUÍDO COM SUCESSO!")
        print(f"{'#'*60}\n")
    else:
        print(f"\n{'#'*60}")
        print("✗ RETREINAMENTO FALHOU")
        print(f"{'#'*60}\n")
    
    return log_entry

def main():
    update_data = '--update-data' in sys.argv or '-u' in sys.argv
    
    result = retrain_all(update_data=update_data)
    
    # Retornar código de saída apropriado
    sys.exit(0 if result['success'] else 1)

if __name__ == "__main__":
    main()
