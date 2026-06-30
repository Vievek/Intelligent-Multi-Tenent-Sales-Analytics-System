const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

// Configure admin SDK to connect to local Firestore and Auth emulators (unless seeding production)
if (process.env.SEED_PROD !== 'true') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8090';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  console.log('🔌 Seeding local emulators...');
} else {
  console.log('🌐 Seeding production Firebase (ensure GOOGLE_APPLICATION_CREDENTIALS is set)...');
}

admin.initializeApp({
  projectId: 'sales-analytics-51405'
});

const db = admin.firestore();
const auth = admin.auth();

const TENANT_ID = 'alpha-corp-id';
const TENANT_CODE = 'ALPHA';

const TENANT2_ID = 'beta-corp-id';
const TENANT2_CODE = 'BETA';

// Helper to delete collection and nested documents recursively (useful for emulator testing clean slate)
async function deleteCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  const batches = [];
  let currentBatch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    // Recursively delete subcollections
    const subcollections = await doc.ref.listCollections();
    for (const sub of subcollections) {
      await deleteCollection(sub);
    }

    currentBatch.delete(doc.ref);
    operationCount++;

    if (operationCount >= 400) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  for (const batch of batches) {
    await batch.commit();
  }
}

async function seed() {
  console.log('🌱 Starting Firestore and Auth database seeding...');

  // Clear existing databases for a clean slate
  console.log('🧹 Clearing existing collections...');
  const collections = await db.listCollections();
  for (const col of collections) {
    console.log(`Deleting collection: ${col.id}...`);
    await deleteCollection(col);
  }


  // 0. Seed Admin User in Auth
  const adminEmail = 'admin@rmet.com';
  console.log(`Setting up Admin user: ${adminEmail}...`);
  try {
    // Delete if already exists to ensure fresh state
    try {
      const existingUser = await auth.getUserByEmail(adminEmail);
      await auth.deleteUser(existingUser.uid);
      console.log('Cleaned up existing admin user.');
    } catch (e) {
      // User doesn't exist, ignore
    }

    const userRecord = await auth.createUser({
      uid: 'admin-user-id',
      email: adminEmail,
      password: 'password123',
      displayName: 'System Admin',
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      tenantId: null // Admin spans all tenants
    });

    console.log('Admin user seeded successfully with email: admin@rmet.com / password: password123');
  } catch (err) {
    console.error('Warning seeding auth user (make sure Auth emulator is running):', err.message);
  }

  // 0b. Seed Tenant Auth User (Alpha Corp)
  const tenantEmail = 'tenant@alpha.com';
  console.log(`Setting up Tenant user: ${tenantEmail}...`);
  try {
    try {
      const existingTenantUser = await auth.getUserByEmail(tenantEmail);
      await auth.deleteUser(existingTenantUser.uid);
      console.log('Cleaned up existing tenant user.');
    } catch (e) {
      // User doesn't exist, ignore
    }

    const tenantUserRecord = await auth.createUser({
      uid: 'alpha-tenant-user-id',
      email: tenantEmail,
      password: 'password123',
      displayName: 'Alpha Corp User',
    });

    await auth.setCustomUserClaims(tenantUserRecord.uid, {
      role: 'tenant',
      tenantId: TENANT_ID, // 'alpha-corp-id'
    });

    console.log('Tenant user seeded successfully with email: tenant@alpha.com / password: password123');
  } catch (err) {
    console.error('Warning seeding tenant auth user:', err.message);
  }

  // 0c. Seed Tenant Auth User (Beta Corp)
  const tenantEmail2 = 'tenant@beta.com';
  console.log(`Setting up Tenant user: ${tenantEmail2}...`);
  try {
    try {
      const existingTenantUser2 = await auth.getUserByEmail(tenantEmail2);
      await auth.deleteUser(existingTenantUser2.uid);
      console.log('Cleaned up existing tenant user 2.');
    } catch (e) {
      // User doesn't exist, ignore
    }

    const tenantUserRecord2 = await auth.createUser({
      uid: 'beta-tenant-user-id',
      email: tenantEmail2,
      password: 'password123',
      displayName: 'Beta Corp User',
    });

    await auth.setCustomUserClaims(tenantUserRecord2.uid, {
      role: 'tenant',
      tenantId: TENANT2_ID, // 'beta-corp-id'
    });

    console.log('Tenant user seeded successfully with email: tenant@beta.com / password: password123');
  } catch (err) {
    console.error('Warning seeding tenant auth user 2:', err.message);
  }


  // 1. Seed Tenant 1 (Alpha Corp)
  console.log(`Setting up tenant: ${TENANT_CODE}...`);
  await db.collection('tenants').doc(TENANT_ID).set({
    name: 'Alpha Corp',
    tenantCode: TENANT_CODE,
    status: 'active',
    plan: 'pro',
    contactEmail: 'admin@alpha.com',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Seed Tenant 2 (Beta Corp)
  console.log(`Setting up tenant: ${TENANT2_CODE}...`);
  await db.collection('tenants').doc(TENANT2_ID).set({
    name: 'Beta Corp',
    tenantCode: TENANT2_CODE,
    status: 'active',
    plan: 'basic',
    contactEmail: 'admin@beta.com',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 2. Seed Agents
  const agentsAlpha = [
    { telegramUserId: '111222333', name: 'Agent Smith', chatId: 12345, messageCount: 15 },
    { telegramUserId: '444555666', name: 'Agent Johnson', chatId: 67890, messageCount: 12 },
    { telegramUserId: '777888999', name: 'Agent Williams', chatId: 11223, messageCount: 8 }
  ];

  const agentsBeta = [
    { telegramUserId: '555111222', name: 'Agent Bond', chatId: 54321, messageCount: 22 },
    { telegramUserId: '555333444', name: 'Agent Carter', chatId: 98765, messageCount: 18 }
  ];

  console.log('Setting up agents for Alpha Corp...');
  for (const agent of agentsAlpha) {
    await db.collection('tenants').doc(TENANT_ID).collection('agents').doc(agent.telegramUserId).set({
      telegramUserId: agent.telegramUserId,
      name: agent.name,
      chatId: agent.chatId,
      status: 'active',
      registeredAt: FieldValue.serverTimestamp(),
      messageCount: agent.messageCount,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  console.log('Setting up agents for Beta Corp...');
  for (const agent of agentsBeta) {
    await db.collection('tenants').doc(TENANT2_ID).collection('agents').doc(agent.telegramUserId).set({
      telegramUserId: agent.telegramUserId,
      name: agent.name,
      chatId: agent.chatId,
      status: 'active',
      registeredAt: FieldValue.serverTimestamp(),
      messageCount: agent.messageCount,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  // 3. Seed Sales Data (Spread across last 10 days for nice trends)
  const products = [
    { name: 'Apples', price: 10 },
    { name: 'Mangoes', price: 50 },
    { name: 'Bags of Rice', price: 500 },
    { name: 'Pencils', price: 2 },
    { name: 'Phones', price: 150 }
  ];

  const extractionMethods = ['huggingface', 'gemini'];
  const confidences = ['HIGH', 'MEDIUM', 'LOW'];

  // Seed product catalog for both tenants so the fuzzy normalizer has a reference list
  console.log('Seeding product catalog...');
  for (const tenant of [TENANT_ID, TENANT2_ID]) {
    for (const product of products) {
      const key = product.name.toLowerCase().replace(/\s+/g, '-');
      await db.collection('tenants').doc(tenant).collection('products').doc(key).set({
        canonicalName: product.name,
      });
    }
  }

  console.log('Seeding sales records...');
  const now = new Date();
  
  // Seed sales for Alpha Corp
  for (let i = 0; i < 30; i++) {
    const agent = agentsAlpha[i % agentsAlpha.length];
    const product = products[i % products.length];
    const quantity = Math.floor(Math.random() * 10) + 1;
    const price = product.price;
    const totalValue = quantity * price;

    // Distribute date over last 10 days
    const date = new Date();
    date.setDate(now.getDate() - (i % 10));
    // Vary hours
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const method = extractionMethods[i % extractionMethods.length];
    const confidence = confidences[i % confidences.length];

    const saleRef = db.collection('tenants').doc(TENANT_ID).collection('sales').doc(`sale-alpha-${String(i + 1).padStart(3, '0')}`);
    await saleRef.set({
      product: product.name,
      quantity,
      price,
      totalValue,
      date: Timestamp.fromDate(date),
      rawMessage: `sold ${quantity} ${product.name.toLowerCase()} for $${totalValue}`,
      agentId: agent.telegramUserId,
      tenantId: TENANT_ID,
      confidence,
      extractionMethod: method,
      processedAt: date.toISOString(),
      createdAt: FieldValue.serverTimestamp()
    });
  }

  // Seed sales for Beta Corp
  for (let i = 0; i < 20; i++) {
    const agent = agentsBeta[i % agentsBeta.length];
    const product = products[(i + 1) % products.length]; // slightly different products mix
    const quantity = Math.floor(Math.random() * 5) + 1;
    const price = product.price;
    const totalValue = quantity * price;

    const date = new Date();
    date.setDate(now.getDate() - (i % 8));
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const method = extractionMethods[i % extractionMethods.length];
    const confidence = confidences[i % confidences.length];

    const saleRef = db.collection('tenants').doc(TENANT2_ID).collection('sales').doc(`sale-beta-${String(i + 1).padStart(3, '0')}`);
    await saleRef.set({
      product: product.name,
      quantity,
      price,
      totalValue,
      date: Timestamp.fromDate(date),
      rawMessage: `sold ${quantity} ${product.name.toLowerCase()} for $${totalValue}`,
      agentId: agent.telegramUserId,
      tenantId: TENANT2_ID,
      confidence,
      extractionMethod: method,
      processedAt: date.toISOString(),
      createdAt: FieldValue.serverTimestamp()
    });
  }

  // 4. Seed some Message Logs
  console.log('Seeding message logs...');
  for (let i = 0; i < 15; i++) {
    const agent = agentsAlpha[i % agentsAlpha.length];
    const date = new Date();
    date.setDate(now.getDate() - (i % 5));

    await db.collection('messageLog').doc(`msg-alpha-${String(i + 1).padStart(3, '0')}`).set({
      telegramUserId: agent.telegramUserId,
      tenantId: TENANT_ID,
      rawMessage: `sold ${i + 1} products for $${(i + 1) * 10}`,
      status: i % 5 === 0 ? 'failed' : 'processed',
      errorReason: i % 5 === 0 ? 'Extraction failed' : null,
      messageId: `msg-pubsub-${1000 + i}`,
      receivedAt: Timestamp.fromDate(date)
    });
  }

  for (let i = 0; i < 10; i++) {
    const agent = agentsBeta[i % agentsBeta.length];
    const date = new Date();
    date.setDate(now.getDate() - (i % 4));

    await db.collection('messageLog').doc(`msg-beta-${String(i + 1).padStart(3, '0')}`).set({
      telegramUserId: agent.telegramUserId,
      tenantId: TENANT2_ID,
      rawMessage: `sold ${i + 2} products for $${(i + 2) * 15}`,
      status: i % 4 === 0 ? 'failed' : 'processed',
      errorReason: i % 4 === 0 ? 'Extraction failed' : null,
      messageId: `msg-pubsub-beta-${2000 + i}`,
      receivedAt: Timestamp.fromDate(date)
    });
  }

  console.log('✅ Seeding completed successfully!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
