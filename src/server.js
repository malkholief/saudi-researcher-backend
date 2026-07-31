import express from "express";
import cors from "cors";
import NodeCache from "node-cache";
import { findTopic, findSaudiAuthorsByTopic } from "./openalex.js";
import { getOrcidRecord, getOrcidWorks, searchOrcid, isValidOrcidFormat } from "./orcid.js";

const app = express();
const PORT = process.env.PORT || 3001;

const cache = new NodeCache({ stdTTL: 60 * 60 * 12 });

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
    });

    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
      });

      app.get("/api/search", async (req, res) => {
        const field = (req.query.field || "").trim();

          if (!field) {
              return res.status(400).json({ error: "Query parameter 'field' is required." });
                }

                  const cacheKey = `search:${field.toLowerCase()}`;
                    const cached = cache.get(cacheKey);
                      if (cached) {
                          return res.json({ ...cached, cached: true });
                            }

                              try {
                                  const topic = await findTopic(field);

                                      if (!topic) {
                                            return res.status(404).json({
                                                    error: `No OpenAlex topic matched "${field}". Try a broader or differently worded term.`,
                                                          });
                                                              }

                                                                  const authors = await findSaudiAuthorsByTopic(topic.id);

                                                                      const payload = {
                                                                            query: field,
                                                                                  topic: topic.displayName,
                                                                                        topicId: topic.id,
                                                                                              count: authors.length,
                                                                                                    authors,
                                                                                                          cached: false,
                                                                                                              };
                                                                                                              
                                                                                                                  cache.set(cacheKey, payload);
                                                                                                                      res.json(payload);
                                                                                                                        } catch (err) {
                                                                                                                            console.error("Search error:", err);
                                                                                                                                res.status(502).json({
                                                                                                                                      error: "Could not reach OpenAlex, or it returned an unexpected response. Please try again shortly.",
                                                                                                                                          });
                                                                                                                                            }
                                                                                                                                            });
                                                                                                                                            
                                                                                                                                            app.get("/api/orcid/:orcidId", async (req, res) => {
                                                                                                                                              const { orcidId } = req.params;
                                                                                                                                              
                                                                                                                                                if (!isValidOrcidFormat(orcidId)) {
                                                                                                                                                    return res.status(400).json({
                                                                                                                                                          error: `"${orcidId}" doesn't look like a valid ORCID iD (expected format: 0000-0002-1825-0097).`,
                                                                                                                                                              });
                                                                                                                                                                }
                                                                                                                                                                
                                                                                                                                                                  const cacheKey = `orcid:${orcidId}`;
                                                                                                                                                                    const cached = cache.get(cacheKey);
                                                                                                                                                                      if (cached) return res.json({ ...cached, cached: true });
                                                                                                                                                                      
                                                                                                                                                                        try {
                                                                                                                                                                            const record = await getOrcidRecord(orcidId);
                                                                                                                                                                                if (!record) {
                                                                                                                                                                                      return res.status(404).json({ error: `No public ORCID record found for ${orcidId}.` });
                                                                                                                                                                                          }
                                                                                                                                                                                          
                                                                                                                                                                                              const works = await getOrcidWorks(orcidId);
                                                                                                                                                                                                  const payload = { ...record, works, cached: false };
                                                                                                                                                                                                  
                                                                                                                                                                                                      cache.set(cacheKey, payload);
                                                                                                                                                                                                          res.json(payload);
                                                                                                                                                                                                            } catch (err) {
                                                                                                                                                                                                                console.error("ORCID lookup error:", err);
                                                                                                                                                                                                                    res.status(502).json({ error: "Could not reach ORCID, or it returned an unexpected response." });
                                                                                                                                                                                                                      }
                                                                                                                                                                                                                      });
                                                                                                                                                                                                                      
                                                                                                                                                                                                                      app.get("/api/orcid-search", async (req, res) => {
                                                                                                                                                                                                                        const { name, institution } = req.query;
                                                                                                                                                                                                                        
                                                                                                                                                                                                                          if (!name) {
                                                                                                                                                                                                                              return res.status(400).json({ error: "Query parameter 'name' is required." });
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                  const parts = [`text:${JSON.stringify(name)}`];
                                                                                                                                                                                                                                    if (institution) parts.push(`affiliation-org-name:${JSON.stringify(institution)}`);
                                                                                                                                                                                                                                      const query = parts.join(" AND ");
                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                        try {
                                                                                                                                                                                                                                            const ids = await searchOrcid(query);
                                                                                                                                                                                                                                                res.json({ query: { name, institution }, orcidIds: ids });
                                                                                                                                                                                                                                                  } catch (err) {
                                                                                                                                                                                                                                                      console.error("ORCID search error:", err);
                                                                                                                                                                                                                                                          res.status(502).json({ error: "Could not reach ORCID's search endpoint." });
                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                            app.listen(PORT, () => {
                                                                                                                                                                                                                                                              console.log(`Saudi Researcher Directory backend listening on port ${PORT}`);
                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                              
