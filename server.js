const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── 네이버 쇼핑 검색 API 프록시 ──
app.get('/api/naver/shop', async (req, res) => {
  const { query, nid, nsec } = req.query;
  if (!query || !nid || !nsec) return res.status(400).json({ error: '파라미터 누락' });
  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=20&sort=sim`,
      { headers: { 'X-Naver-Client-Id': nid, 'X-Naver-Client-Secret': nsec } }
    );
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 네이버 DataLab 검색어 트렌드 API 프록시 ──
app.post('/api/naver/datalab', async (req, res) => {
  const { nid, nsec, ...body } = req.body;
  if (!nid || !nsec) return res.status(400).json({ error: '파라미터 누락' });
  try {
    const r = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': nid,
        'X-Naver-Client-Secret': nsec
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Claude API 프록시 ──
app.post('/api/claude', async (req, res) => {
  const { claudeKey, ...body } = req.body;
  if (!claudeKey) return res.status(400).json({ error: 'Claude API 키 누락' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API 키 테스트 ──
app.get('/api/test', async (req, res) => {
  const { nid, nsec } = req.query;
  const results = { shop: false, datalab: false };
  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=스마트워치&display=1`,
      { headers: { 'X-Naver-Client-Id': nid, 'X-Naver-Client-Secret': nsec } }
    );
    results.shop = r.ok;
  } catch(e) {}
  try {
    const now = new Date();
    const end = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const s = new Date(now); s.setMonth(s.getMonth()-3);
    const start = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-01`;
    const r = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Naver-Client-Id': nid, 'X-Naver-Client-Secret': nsec },
      body: JSON.stringify({ startDate: start, endDate: end, timeUnit: 'month',
        keywordGroups: [{ groupName: '테스트', keywords: ['스마트워치'] }] })
    });
    results.datalab = r.ok;
  } catch(e) {}
  res.json(results);
});

// ── 헬스체크 ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── 메인 페이지 ──
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`디아나 서버 실행중: http://localhost:${PORT}`));
