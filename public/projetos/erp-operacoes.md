---
year: 2025
featured: true
role: Arquitetura do módulo e implementação
stack: [React, Node.js, PostgreSQL, Docker]
alts:
  - Tela de configuração de grupos e permissões do ERP
---

# ERP de Operações

Módulo de permissões e telas dinâmicas para um ERP com vários perfis de usuário.

O sistema tinha dezenas de telas e cada grupo de usuário precisava ver um recorte diferente. A regra estava espalhada em condicionais pelo código inteiro, e cada perfil novo custava dias.

Centralizei tudo num modelo de grupos, permissões e telas, com a interface se montando a partir dele. Criar um perfil novo virou configuração, não deploy.
