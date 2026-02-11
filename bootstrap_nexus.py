import os
from github_forge_connect import GitHubForge
from dotenv import load_dotenv

load_dotenv()

def iniciar_ecossistema():
    token = os.getenv("GITHUB_TOKEN")
    forge = GitHubForge(token)
    
    print("🧠 [NEXUS CORE] Iniciando o Grande Arquiteto...")
    
    # 1. Cria o Repositório Principal
    repo_url = forge.create_startup_repo(
        name="Nexus-Prime-Core",
        description="O Coração do Ecossistema de Agentes Sencientes do Oneverso."
    )
    
    if repo_url:
        print(f"✨ [SUCESSO] Repositório mestre criado em: {repo_url}")
        print("📁 [PRÓXIMO] Subindo camadas de DNA, Compliance e Parlamento...")
    else:
        print("❌ [ERRO] Verifique as permissões do seu Token Classic.")

if __name__ == "__main__":
    iniciar_ecossistema()
