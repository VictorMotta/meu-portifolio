---
role: Mid-level Software Engineer
alts:
  - Title card for the Agricultural Platform project, showing the name over a dark background and the AWS, Python and Google Earth Engine stack
---

# Agricultural Platform and Geospatial Analysis

Data collection, processing and analysis for agribusiness, running on AWS. This was my work at AgriSafe, from November 2023 to May 2026.

I built the crawlers and pipelines in Python (Scrapy, BeautifulSoup, Pandas) and Node.js, pulling data from several sources automatically. The heavy processing went into asynchronous microservices with AWS Lambda, SQS and BullMQ over Redis. Satellite imagery analysis takes far too long to fit inside a synchronous request, so everything became a queue.

The most interesting part was the geospatial analysis with PostGIS, GeoPandas and Google Earth Engine, pulling indicators about cultivated land straight out of the imagery. I also set up the EC2 infrastructure with Auto Scaling, Load Balancer and automated deploys through GitHub Actions.

The code belongs to the company. What is here is the account of it, but I can go into the technical detail in a conversation.
