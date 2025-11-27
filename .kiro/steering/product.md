# Visão Geral do Produto

Uma aplicação full-stack de captura de reconhecimento facial que permite aos usuários capturar imagens faciais através de uma interface web com orientação visual e feedback em tempo real.

## Funcionalidade Principal

- Feed de câmera ao vivo com guia de posicionamento facial (sobreposição oval)
- Captura de imagem com compressão e otimização automáticas
- Processamento de reconhecimento facial via API backend
- Rastreamento de falhas com bloqueio de usuário após tentativas máximas
- Suporte a incorporação em iframe com comunicação PostMessage
- Design responsivo para dispositivos móveis, tablets e desktops

## Recursos Principais

- Troca de câmera (frontal/traseira em dispositivos móveis)
- Feedback visual para sucesso/falha de captura
- Rastreamento de tentativas com exibição de tentativas restantes
- Tratamento abrangente de erros para problemas de câmera e rede
- Otimizações de performance para tamanho de imagem e eficiência de rede

## Fluxo do Usuário

### Carregamento Inicial
1. Aplicação verifica se o usuário está cadastrado via API backend
2. Usuário concede permissões de câmera
3. Feed da câmera é exibido com guia de posicionamento facial

### Fluxo de Cadastro (Usuários Não Cadastrados)
1. Usuário posiciona o rosto dentro da guia oval
2. Usuário captura imagem via botão
3. Imagem é enviada para o backend para cadastro
4. Backend cria usuário na API de reconhecimento facial e adiciona credencial facial (template)
5. Detecção de vivacidade realizada durante criação da credencial
6. Em caso de sucesso: Tela de sucesso exibida e janela pai notificada
7. Em caso de detecção de fraude: Mensagem de erro mostrada, usuário pode tentar novamente
8. Em caso de falha: Mensagem de erro mostrada, usuário pode tentar novamente

### Fluxo de Identificação (Usuários Cadastrados)
1. Usuário posiciona o rosto dentro da guia oval
2. Usuário captura imagem via botão
3. Imagem é processada pela API de reconhecimento facial com verificação em duas etapas:
   - Etapa 1: Detecção de Vivacidade (Extract) - Detecta tentativas de fraude
   - Etapa 2: Identificação de Usuário (Identify) - Compara com usuário cadastrado
4. Em caso de sucesso: Tela de sucesso exibida e janela pai notificada
5. Em caso de detecção de fraude: Mensagem de erro mostrada, usuário pode tentar novamente
6. Em caso de falha: Usuário pode tentar novamente (até máximo de tentativas se configurado)
7. Em caso de tentativas máximas excedidas: Usuário é bloqueado (se MAX_FAILURE_ATTEMPTS > 0)

## Integração

A aplicação é projetada para ser incorporada em um iframe e se comunica com a janela pai usando a API PostMessage para notificar sobre sucesso/falha de captura.
