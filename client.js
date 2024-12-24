const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server C2 Aktif');
});

app.post('/command', (req, res) => {
  const { agentId, command } = req.body;

  console.log(`Command diterima untuk Agent ${agentId}: ${command}`);
  
  res.json({ status: 'OK', received: { agentId, command } });
});

app.post('/data', (req, res) => {
  const { agentId, data } = req.body;

  console.log(`Data diterima dari Agent ${agentId}:`, data);
  
  res.json({ status: 'Data Received', received: { agentId, data } });
});

app.listen(port, () => {
  console.log(`Server C2 berjalan di http://localhost:${port}`);
});
