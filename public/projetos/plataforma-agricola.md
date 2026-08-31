---
year: 2023
featured: true
role: Engenheiro de Software Pleno
stack: [Node.js, TypeScript, Python, AWS, PostgreSQL, Redis, Docker]
alts:
  - Cartão do projeto Plataforma Agrícola, com o nome sobre fundo escuro e a stack AWS, Python e Google Earth Engine
---

# Plataforma Agrícola e Análise Geoespacial

Coleta, processamento e análise de dados para o agronegócio, rodando na AWS. Foi o meu trabalho na AgriSafe, de novembro de 2023 a maio de 2026.

Fiz os crawlers e os pipelines em Python (Scrapy, BeautifulSoup, Pandas) e Node.js, puxando dados de várias fontes automaticamente. O processamento pesado ficou em microservices assíncronos com AWS Lambda, SQS e BullMQ sobre Redis. Análise de imagem de satélite demora demais para caber numa requisição síncrona, então tudo virou fila.

A parte mais interessante foi a análise geoespacial com PostGIS, GeoPandas e Google Earth Engine, tirando indicadores de área de cultivo direto das imagens. Também montei a infra em EC2 com Auto Scaling, Load Balancer e deploy automático por GitHub Actions.

O código é da empresa. Aqui fica só o relato, mas posso entrar no detalhe técnico numa conversa.
