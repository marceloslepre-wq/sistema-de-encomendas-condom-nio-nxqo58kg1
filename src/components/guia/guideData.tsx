import { GuideSectionData } from './GuideSectionCard'
import {
  ModalPreviewCicloEncomenda,
  ModalPreviewUsuario,
  ModalPreviewUnidade,
  ModalPreviewTransportadora,
  ModalPreviewLogistica,
  ModalPreviewRegistroPortaria,
  ModalPreviewTriagemRetirada,
  ModalPreviewRelatorios,
  ModalPreviewPermissoes,
  ModalPreviewWhatsApp,
  ModalPreviewLicencaPix,
} from './ModalPreviews'

/**
 * 11 Seções do Guia de Uso do CondPack
 * Adaptadas com precisão para as rotas reais, regras de negócio e capturas em runtime dos modais.
 */
export const CONDPACK_GUIDE_SECTIONS: GuideSectionData[] = [
  // 01. Primeiros Passos
  {
    id: 'primeiros-passos',
    number: '01',
    order: 1,
    category: 'Visão Geral',
    title: 'Primeiros Passos no CondPack',
    subtitle:
      'Entenda como o CondPack funciona, os 5 perfis de acesso e o ciclo da encomenda desde a chegada até a retirada segura pelo morador.',
    targetRoute: '/gestor/dashboard',
    targetLabel: 'Ir para Dashboard',
    allowedRoles: ['gestor', 'morador', 'porteiro', 'portaria', 'triagem', 'master'],
    steps: [
      {
        step: 1,
        title: 'Perfis de Acesso do Sistema',
        description:
          'O CondPack opera com 5 perfis com visões específicas: Gestor (administração global e relatórios), Portaria/Porteiro (recepção do entregador e entrada), Triagem (etiquetagem e organização), Morador (acompanhamento e código de retirada) e Master (gestão multi-tenant).',
      },
      {
        step: 2,
        title: 'Conceito de Torre & Unidade',
        description:
          'Cada morador é vinculado à sua Torre (ex.: Torre A) e Unidade/Apartamento (ex.: 402). O CondPack conta com matching flexível inteligente que reconhece tanto "Torre A" quanto apenas "A" sem conflitos no registro.',
      },
      {
        step: 3,
        title: 'Ciclo Seguro da Encomenda',
        description:
          '1. Entrada na Portaria com dados do entregador → 2. Triagem e etiquetagem na sala de encomendas → 3. Disparo automático do código de retirada via WhatsApp → 4. Validação do código de 6 dígitos na entrega.',
      },
    ],
    previewComponent: <ModalPreviewCicloEncomenda />,
    tips: [
      {
        title: 'Sistema 100% Web e Responsivo',
        text: 'O CondPack funciona perfeitamente em computadores da portaria, tablets da sala de encomendas e no smartphone do morador, sem necessidade de instalar aplicativos em lojas.',
      },
      {
        title: 'Segurança com Auditoria Completa',
        text: 'Cada movimentação gera histórico imutável: quem recebeu na portaria, data e hora da triagem e quem retirou com o código.',
      },
    ],
    warnings: [
      {
        title: 'Cadastro do Celular do Morador',
        text: 'Mantenha o telefone WhatsApp do morador sempre atualizado no cadastro para que os alertas e códigos de retirada cheguem instantaneamente.',
      },
    ],
  },

  // 02. Usuários & Link de Convite
  {
    id: 'usuarios-convite',
    number: '02',
    order: 2,
    category: 'Administração',
    title: 'Usuários & Link de Convite Inteligente',
    subtitle:
      'Cadastre moradores, porteiros e equipe de triagem manualmente ou gere links de convite compartilháveis via WhatsApp e e-mail.',
    targetRoute: '/gestor/usuarios',
    targetLabel: 'Ir para Usuários',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Adicionar Usuário Direto',
        description:
          'Na aba Usuários, clique em "+ Adicionar Usuário". Escolha o perfil (Morador, Porteiro, Portaria, Triagem ou Gestor), preencha nome, e-mail de acesso e senha inicial com no mínimo 8 dígitos.',
      },
      {
        step: 2,
        title: 'Vincular Torre, Unidade e CPF',
        description:
          'Para usuários com perfil "Morador", o CondPack exige obrigatoriamente CPF, Torre e Apartamento para correlação automática com as encomendas recebidas na portaria.',
      },
      {
        step: 3,
        title: 'Gerar Link de Convite Inteligente',
        description:
          'Clique em "Gerar Link de Convite", selecione o perfil e opcionalmente a torre/unidade. O sistema cria um token único e permite copiar o link ou enviá-lo com 1 clique pelo WhatsApp para o morador se cadastrar.',
      },
    ],
    previewComponent: <ModalPreviewUsuario />,
    tips: [
      {
        title: 'Compartilhamento Rápido no WhatsApp',
        text: 'Ao gerar um link de convite, use o botão de compartilhar para abrir o WhatsApp Web diretamente com mensagem pré-formatada para o morador.',
      },
    ],
    warnings: [
      {
        title: 'Limite do Plano Contratado',
        text: 'O número de moradores ativos é controlado pelo plano do condomínio. Caso atinja o limite, faça o upgrade na aba Licenças e Planos.',
      },
    ],
  },

  // 03. Unidades
  {
    id: 'unidades',
    number: '03',
    order: 3,
    category: 'Administração',
    title: 'Unidades, Torres e Apartamentos',
    subtitle:
      'Estruture as torres, blocos e apartamentos do condomínio para alimentar a portaria com preenchimento preditivo e matching flexível.',
    targetRoute: '/gestor/unidades',
    targetLabel: 'Ir para Unidades',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Cadastrar Nova Unidade',
        description:
          'Acesse "Unidades" e clique em "+ Adicionar Unidade". Informe a identificação da Torre/Bloco (ex: A, Torre 1, Norte) e o número do Apartamento (ex: 101, 102A).',
      },
      {
        step: 2,
        title: 'Matching Flexível Inteligente',
        description:
          'O algoritmo do CondPack normaliza as strings: se a portaria registrar "Torre A" ou simplesmente "A", o sistema correlaciona ao mesmo apartamento e ao mesmo morador.',
      },
      {
        step: 3,
        title: 'Gestão e Exclusão Segura',
        description:
          'Edite a qualquer momento. Para exclusão, o CondPack exige confirmação com alerta de segurança caso existam moradores ou encomendas em andamento vinculados à unidade.',
      },
    ],
    previewComponent: <ModalPreviewUnidade />,
    tips: [
      {
        title: 'Padronização de Torres',
        text: 'Mantenha nomes simples para as torres (ex.: "Torre A", "Torre B"). Isso facilita a busca rápida pelo porteiro na barra de digitação.',
      },
    ],
    warnings: [
      {
        title: 'Unidades com Encomendas Pendentes',
        text: 'Evite excluir unidades com encomendas ativas aguardando retirada para não quebrar a rastreabilidade do histórico.',
      },
    ],
  },

  // 04. Transportadoras
  {
    id: 'transportadoras',
    number: '04',
    order: 4,
    category: 'Administração',
    title: 'Cadastro de Transportadoras',
    subtitle:
      'Mantenha a lista das principais empresas e transportadoras cadastradas para seleção em 1 clique na portaria.',
    targetRoute: '/gestor/transportadoras',
    targetLabel: 'Ir para Transportadoras',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Adicionar Transportadora',
        description:
          'Em Transportadoras, clique em "+ Adicionar". Insira o nome da empresa (ex: Correios, Mercado Livre, Jadlog, Loggi, Amazon, DHL) e o telefone de contato.',
      },
      {
        step: 2,
        title: 'Seleção Rápida na Portaria',
        description:
          'As transportadoras cadastradas aparecem como opções rápidas no momento da chegada do entregador, acelerando o atendimento na guarita.',
      },
      {
        step: 3,
        title: 'Rastreabilidade nos Relatórios',
        description:
          'Permite filtrar relatórios e auditorias pela transportadora que mais entrega no condomínio e identificar padrões de entrega.',
      },
    ],
    previewComponent: <ModalPreviewTransportadora />,
    tips: [
      {
        title: 'Cadastre as Transportadoras Frequentes',
        text: 'Cadastre antecipadamente as 5 a 10 transportadoras mais comuns do condomínio. Isso reduz o tempo de registro na portaria para menos de 30 segundos.',
      },
    ],
    warnings: [
      {
        title: 'Nome Oficial da Transportadora',
        text: 'Prefira cadastrar o nome conhecido pelo mercado (ex: "Mercado Envios" ou "Correios") para evitar duplicidade de nomes similares.',
      },
    ],
  },

  // 05. Logística
  {
    id: 'logistica',
    number: '05',
    order: 5,
    category: 'Administração',
    title: 'Logística, Armazenamento & Prateleiras',
    subtitle:
      'Organize a sala de encomendas com tipos de volumes padronizados e localizações de prateleiras para localização imediata do pacote.',
    targetRoute: '/gestor/logistica',
    targetLabel: 'Ir para Logística',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Tipos de Volume',
        description:
          'Defina os tipos físicos de pacotes: Envelope, Caixa P, Pacote Médio, Caixa Grande, Fardo ou Alimentos/Perecíveis.',
      },
      {
        step: 2,
        title: 'Locais de Prateleira',
        description:
          'Identifique as divisões físicas da sala: Prateleira A - Nível 1, Prateleira B, Gaveteiro 03, Chão Setor C, Armário Trancado.',
      },
      {
        step: 3,
        title: 'Associação na Triagem',
        description:
          'Ao processar a encomenda na triagem, o operador seleciona o tipo e o local exato da prateleira. Isso imprime na etiqueta e aparece na tela de retirada.',
      },
    ],
    previewComponent: <ModalPreviewLogistica />,
    tips: [
      {
        title: 'Etiquetas Físicas nas Prateleiras',
        text: 'Cole adesivos com os mesmos nomes (ex.: "Prateleira A2") nas estantes físicas da sala. O porteiro achará o pacote em 5 segundos.',
      },
    ],
    warnings: [
      {
        title: 'Não Exclua Prateleiras Ocupadas',
        text: 'Se houver pacotes alocados em uma localização, mantenha a prateleira ativa até que os moradores retirem todos os volumes.',
      },
    ],
  },

  // 06. Registro
  {
    id: 'registro',
    number: '06',
    order: 6,
    category: 'Operação Diária',
    title: 'Registro de Encomenda na Portaria',
    subtitle:
      'O fluxo diário do porteiro: validação dos dados do entregador, identificação da unidade do morador e geração do protocolo de entrada.',
    targetRoute: '/portaria/registro',
    targetLabel: 'Ir para Registro Portaria',
    allowedRoles: ['gestor', 'porteiro', 'portaria', 'master'],
    steps: [
      {
        step: 1,
        title: 'Identificar o Entregador',
        description:
          'Preencha o nome, CPF e WhatsApp do entregador. O CondPack memoriza entregadores recorrentes na tabela de entregadores para preenchimento automático.',
      },
      {
        step: 2,
        title: 'Selecionar Unidade e Morador',
        description:
          'Use o campo de busca inteligente por Torre e Apartamento (ex.: A-402). O sistema lista os moradores cadastrados naquela unidade automaticamente.',
      },
      {
        step: 3,
        title: 'Informar Quantidade de Volumes',
        description:
          'Informe quantos pacotes aquela entrega contém (ex.: 2 volumes). Você pode adicionar múltiplas unidades na mesma remessa do mesmo entregador.',
      },
      {
        step: 4,
        title: 'Concluir Entrada',
        description:
          'Clique em "Finalizar Recebimento". O CondPack grava a entrada na portaria e encaminha o volume imediatamente para a fila da Sala de Triagem.',
      },
    ],
    previewComponent: <ModalPreviewRegistroPortaria />,
    tips: [
      {
        title: 'Busca Rápida de Unidade',
        text: 'Digite apenas o número do apartamento para filtrar rapidamente todas as torres correspondentes.',
      },
    ],
    warnings: [
      {
        title: 'Validação Obrigatória do Entregador',
        text: 'Nunca cadastre um CPF fictício para o entregador. O registro do entregador é a garantia legal de auditoria do condomínio.',
      },
    ],
  },

  // 07. Triagem & Retirada
  {
    id: 'triagem-retirada',
    number: '07',
    order: 7,
    category: 'Operação Diária',
    title: 'Triagem & Retirada com Código Seguro',
    subtitle:
      'Conferência dos volumes na sala de encomendas, disparo do código de liberação e validação dos 6 dígitos na entrega ao morador.',
    targetRoute: '/sala/triagem',
    targetLabel: 'Ir para Triagem',
    allowedRoles: ['gestor', 'morador', 'porteiro', 'portaria', 'triagem', 'master'],
    steps: [
      {
        step: 1,
        title: 'Receber Volumes na Sala de Triagem',
        description:
          'Os pacotes recebidos na portaria aparecem na fila de pendentes da Sala de Triagem. Clique em "Processar" para iniciar a conferência.',
      },
      {
        step: 2,
        title: 'Etiquetagem e Localização',
        description:
          'Vincule o tipo de volume, o local da prateleira e opcionalmente o código de rastreio ou foto do pacote. Imprima a etiqueta se houver impressora térmica.',
      },
      {
        step: 3,
        title: 'Geração do Código de Retirada (6 dígitos)',
        description:
          'Ao liberar para retirada, o CondPack gera um código exclusivo de 6 números (ex.: 741852) e dispara automaticamente via WhatsApp ao morador.',
      },
      {
        step: 4,
        title: 'Validação no Momento da Entrega',
        description:
          'Na tela de Retirada (/sala/retirada), o morador apresenta o código. O operador digita os 6 dígitos: o sistema confere instantaneamente, dá baixa e emite confirmação.',
      },
    ],
    previewComponent: <ModalPreviewTriagemRetirada />,
    tips: [
      {
        title: 'Visão do Morador: Como Acompanhar',
        text: 'O morador abre o CondPack no celular e vê suas encomendas ativas com o código de 6 dígitos em destaque na cor verde, pronto para apresentar na portaria.',
      },
      {
        title: 'Retirada por Terceiros',
        text: 'O morador pode configurar se autoriza terceiros a retirarem a encomenda com o código ou se exige retirada estritamente presencial.',
      },
    ],
    warnings: [
      {
        title: 'Nunca Entregue Sem o Código',
        text: 'O código de retirada de 6 dígitos é a assinatura digital do morador. Sem ele, a portaria não consegue registrar a baixa no sistema.',
      },
    ],
  },

  // 08. Relatórios
  {
    id: 'relatorios',
    number: '08',
    order: 8,
    category: 'Gestão',
    title: 'Relatórios Operacionais & Auditoria',
    subtitle:
      'Filtre e exporte todo o histórico de movimentação das encomendas em planilhas CSV para prestação de contas e relatórios da sindicância.',
    targetRoute: '/gestor/relatorios',
    targetLabel: 'Ir para Relatórios',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Definir Período',
        description:
          'Selecione a data inicial e a data final da consulta para analisar o fluxo de encomendas semanal, mensal ou personalizado.',
      },
      {
        step: 2,
        title: 'Filtrar por Torre e Status',
        description:
          'Isole uma torre específica ou filtre por status: Recebido na Portaria, Disponível para Retirada ou Retirado com Sucesso.',
      },
      {
        step: 3,
        title: 'Exportar para CSV / Excel',
        description:
          'Clique em "Exportar CSV" para baixar um arquivo completo com código de rastreio, torre, apartamento, status, transportadora, data/hora de entrada e de saída.',
      },
    ],
    previewComponent: <ModalPreviewRelatorios />,
    tips: [
      {
        title: 'Auditoria em Caso de Dúvida de Morador',
        text: 'Se algum morador indagar sobre um pacote, filtre pelo número da unidade nos relatórios para obter minuto a minuto quem recebeu e quem retirou.',
      },
    ],
    warnings: [
      {
        title: 'Dados Históricos Imutáveis',
        text: 'Os registros de entrada e saída são gravados com timestamp oficial do servidor e não podem ser apagados manualmente para preservar a segurança jurídica.',
      },
    ],
  },

  // 09. Permissões
  {
    id: 'permissoes',
    number: '09',
    order: 9,
    category: 'Administração',
    title: 'Permissões & Matriz de Perfis',
    subtitle:
      'Veja com clareza o que cada usuário pode e não pode fazer dentro do CondPack, garantindo a proteção e integridade dos dados.',
    targetRoute: '/gestor/permissoes',
    targetLabel: 'Ir para Permissões',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Perfil Gestor (Síndico / Administração)',
        description:
          'Acesso total: gerencia usuários, unidades, transportadoras, configurações do condomínio, WhatsApp próprio, relatórios e renovação de licença.',
      },
      {
        step: 2,
        title: 'Perfis Portaria, Porteiro e Triagem',
        description:
          'Acesso operacional focado: registrar encomendas, cadastrar entregadores, processar volumes na triagem e validar código de entrega. Não acessam relatórios financeiros nem licenças.',
      },
      {
        step: 3,
        title: 'Perfil Morador',
        description:
          'Acesso exclusivo às próprias encomendas da sua unidade, timeline em tempo real, visualização do código de retirada e chave de autorização para terceiros.',
      },
    ],
    previewComponent: <ModalPreviewPermissoes />,
    tips: [
      {
        title: 'Princípio do Menor Privilégio',
        text: 'Crie contas de Porteiro apenas para os funcionários da guarita e contas de Triagem para os conferencistas da sala, mantendo o acesso administrativo restrito ao síndico.',
      },
    ],
    warnings: [
      {
        title: 'Permissões Nativas Travadas',
        text: 'Permissões críticas marcadas em cinza são nativas do sistema CondPack e não podem ser desativadas por segurança operacional.',
      },
    ],
  },

  // 10. Configurações
  {
    id: 'configuracoes',
    number: '10',
    order: 10,
    category: 'Comunicação',
    title: 'Configurações & WhatsApp Próprio do Condomínio',
    subtitle:
      'Personalize os templates de notificação com variáveis dinâmicas e pareie o WhatsApp institucional do condomínio com QR Code e contagem regressiva.',
    targetRoute: '/gestor/configuracoes',
    targetLabel: 'Ir para Configurações',
    allowedRoles: ['gestor', 'master'],
    steps: [
      {
        step: 1,
        title: 'Dados Cadastrais do Condomínio',
        description:
          'Preencha Razão Social, CNPJ, e-mail institucional, endereço completo e envie o logotipo do condomínio para personalização do cabeçalho.',
      },
      {
        step: 2,
        title: 'Templates de Notificação com Tags',
        description:
          'Configure mensagens automáticas personalizadas para cada etapa usando as variáveis disponíveis: {nome}, {unidade}, {torre}, {transportadora}, {codigo_retirada} e {volumes}.',
      },
      {
        step: 3,
        title: 'Conectar WhatsApp Institucional via QR Code',
        description:
          'Clique em "Conectar WhatsApp". Um modal exibirá um QR Code em tempo real com contagem regressiva de 2 minutos (120s). No celular do condomínio, abra Aparelhos Conectados e aponte para a tela.',
      },
      {
        step: 4,
        title: 'Status em Tempo Real',
        description:
          'Assim que pareado, o card exibirá a etiqueta verde "Conectado" com o número oficial do condomínio. Caso expire os 2 minutos, basta clicar em "Tentar novamente" para gerar nova chave.',
      },
    ],
    previewComponent: <ModalPreviewWhatsApp />,
    tips: [
      {
        title: 'Contagem Regressiva de 2 Minutos',
        text: 'O QR Code do WhatsApp possui validade de 120 segundos por exigência de segurança. Caso expire, basta clicar para gerar uma nova chave de pareamento.',
      },
      {
        title: 'WhatsApp Próprio Gera Mais Confiança',
        text: 'Ao conectar o número institucional do condomínio, os moradores recebem as notificações diretamente do contato oficial da administração.',
      },
    ],
    warnings: [
      {
        title: 'Evite Números Pessoais',
        text: 'Não utilize números pessoais de funcionários com alta rotatividade para o canal de notificações oficiais do condomínio.',
      },
    ],
  },

  // 11. Licença e Planos
  {
    id: 'licencas-planos',
    number: '11',
    order: 11,
    category: 'Financeiro',
    title: 'Licença, Planos & Renovação Instantânea por PIX',
    subtitle:
      'Acompanhe o período de trial de 15 dias, consulte o plano vigente e renove com liberação automática em segundos através do PIX Mercado Pago.',
    targetRoute: '/gestor/licencas',
    targetLabel: 'Ir para Licenças',
    allowedRoles: ['gestor', 'morador', 'master'],
    steps: [
      {
        step: 1,
        title: 'Período de Degustação (Trial de 15 Dias)',
        description:
          'Todo novo condomínio cadastrado no CondPack recebe 15 dias de teste gratuito com todas as funcionalidades liberadas e sem compromisso.',
      },
      {
        step: 2,
        title: 'Monitoramento da Validade',
        description:
          'Acompanhe os dias restantes através da barra regressiva colorida (verde > 10 dias, amarela nos últimos 10 dias e vermelha nos últimos 5 dias).',
      },
      {
        step: 3,
        title: 'Renovação Instantânea por PIX (30 Dias)',
        description:
          'Clique em "Renovar Licença com PIX". O sistema gera o QR Code e o código PIX Copia e Cola via Mercado Pago. O pagamento é aprovado em até 10 segundos sem envio de comprovante.',
      },
      {
        step: 4,
        title: 'O que Acontece ao Expirar?',
        description:
          'Caso a licença expire sem renovação, o sistema bloqueia o acesso operacional e redireciona os usuários para a página segura de renovação (/renovar), mantendo todos os dados e histórico intactos.',
      },
    ],
    previewComponent: <ModalPreviewLicencaPix />,
    tips: [
      {
        title: 'Liberação Automática pelo Gateway',
        text: 'Não é necessário enviar comprovante para suporte: assim que o PIX é pago no seu banco, o Mercado Pago notifica o CondPack e a licença é estendida automaticamente.',
      },
      {
        title: 'Visão do Morador',
        text: 'Moradores podem consultar o status da licença do condomínio para saber se o sistema está regular e ativo na administração.',
      },
    ],
    warnings: [
      {
        title: 'Renovação com Antecedência',
        text: 'Recomenda-se realizar a renovação antes do último dia útil para evitar interrupções no fluxo de registro de encomendas na portaria.',
      },
    ],
  },
]

/**
 * Seções filtradas para a Vitrine Pública de Vendas (/guia-publica):
 * Exibe apenas as funcionalidades estratégicas de conversão:
 * 1. Primeiros Passos (visão do ciclo e perfis)
 * 6. Registro de Encomenda na Portaria
 * 7. Triagem & Retirada com Código Seguro
 * 10. Configurações & WhatsApp Próprio do Condomínio (com QR Code de pareamento)
 * 11. Licença e Planos (explicando o trial de 15 dias e renovação PIX)
 */
export const CONDPACK_PUBLIC_SECTIONS: GuideSectionData[] = CONDPACK_GUIDE_SECTIONS.filter(
  (sec) =>
    sec.id === 'primeiros-passos' ||
    sec.id === 'registro' ||
    sec.id === 'triagem-retirada' ||
    sec.id === 'configuracoes' ||
    sec.id === 'licencas-planos',
)
