const express = require('express');
const bodyParser = require('body-parser');
const { faker } = require('@faker-js/faker');

const app = express();
app.use(bodyParser.json());

// Generate 250 mock records in memory
let products = Array.from({ length: 250 }, (_, i) => ({
  ID: i + 1,
  Name: faker.commerce.productName(),
  Price: parseFloat(faker.commerce.price()),
  Stock: faker.number.int({ min: 10, max: 500 })
}));

// $metadata schema required by Salesforce Connect
app.get(['/$metadata', '/$metadata/'], (req, res) => {
  res.set('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="MockService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Product">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Name" Type="Edm.String"/>
        <Property Name="Price" Type="Edm.Decimal"/>
        <Property Name="Stock" Type="Edm.Int32"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Products" EntityType="MockService.Product"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);
});

// Root Service Document
app.get('/', (req, res) => {
  res.json({ "@odata.context": "$metadata", "value": [{ "name": "Products", "kind": "EntitySet", "url": "Products" }] });
});

// READ Collection ($top / $skip pagination)
app.get('/Products', (req, res) => {
  const top = parseInt(req.query.$top) || 250;
  const skip = parseInt(req.query.$skip) || 0;
  res.json({
    "@odata.context": "$metadata#Products",
    "@odata.count": products.length,
    "value": products.slice(skip, skip + top)
  });
});

// READ Single Record
app.get(/\/Products\(([^)]+)\)/, (req, res) => {
  const item = products.find(p => p.ID === parseInt(req.params[0]));
  item ? res.json(item) : res.status(404).end();
});

// CREATE Record
app.post('/Products', (req, res) => {
  const newItem = { ID: products.length + 1, ...req.body };
  products.push(newItem);
  res.status(201).json(newItem);
});

// UPDATE Record (Writable PATCH)
app.patch(/\/Products\(([^)]+)\)/, (req, res) => {
  const id = parseInt(req.params[0]);
  const idx = products.findIndex(p => p.ID === id);
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...req.body };
    res.json(products[idx]);
  } else res.status(404).end();
});

// DELETE Record
app.delete(/\/Products\(([^)]+)\)/, (req, res) => {
  products = products.filter(p => p.ID !== parseInt(req.params[0]));
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`OData service running on port ${PORT}`));
}