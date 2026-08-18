const { getFirebaseAdmin } = require('./_firebase');

const AUCTION_ID = 'painting-29';
const STARTING_BID = 550;
const MIN_INCREMENT = 25;
const DEADLINE_ISO = '2026-12-20T23:59:59-06:00';

function moneyValue(value) {
  return Math.round(Number(value || 0));
}

function publicBid(doc) {
  const data = doc.data() || {};
  return {
    name: data.name || 'Collector',
    amount: moneyValue(data.amount),
    createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : null,
  };
}

function isClosed() {
  return Date.now() > new Date(DEADLINE_ISO).getTime();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const auctionRef = db.collection('auctions').doc(AUCTION_ID);

    if (req.method === 'GET') {
      const [auctionDoc, bidSnapshot] = await Promise.all([
        auctionRef.get(),
        auctionRef.collection('bids').orderBy('createdAt', 'desc').limit(8).get(),
      ]);
      const auction = auctionDoc.exists ? auctionDoc.data() : {};

      return res.status(200).json({
        auctionId: AUCTION_ID,
        paintingNumber: 29,
        paintingCode: 'AEE129',
        startingBid: STARTING_BID,
        minIncrement: MIN_INCREMENT,
        deadline: DEADLINE_ISO,
        closed: isClosed(),
        currentBid: moneyValue(auction.currentBid || STARTING_BID),
        currentBidderName: auction.currentBidderName || null,
        bids: bidSnapshot.docs.map(publicBid),
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const amount = moneyValue(body.amount);

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (isClosed()) {
      return res.status(400).json({ error: 'This auction is closed.' });
    }

    const bidRef = auctionRef.collection('bids').doc();
    const result = await db.runTransaction(async (transaction) => {
      const auctionDoc = await transaction.get(auctionRef);
      const auction = auctionDoc.exists ? auctionDoc.data() : {};
      const currentBid = moneyValue(auction.currentBid || STARTING_BID);
      const requiredBid = currentBid + MIN_INCREMENT;

      if (amount < requiredBid) {
        return {
          accepted: false,
          currentBid,
          requiredBid,
          error: `The next bid must be at least $${requiredBid}.`,
        };
      }

      transaction.set(bidRef, {
        name,
        email,
        amount,
        paintingNumber: 29,
        paintingCode: 'AEE129',
        source: 'auction.html',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(auctionRef, {
        paintingNumber: 29,
        paintingCode: 'AEE129',
        startingBid: STARTING_BID,
        minIncrement: MIN_INCREMENT,
        deadline: DEADLINE_ISO,
        currentBid: amount,
        currentBidderName: name,
        currentBidderEmail: email,
        bidCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        accepted: true,
        currentBid: amount,
        requiredBid: amount + MIN_INCREMENT,
      };
    });

    if (!result.accepted) {
      return res.status(409).json(result);
    }

    return res.status(200).json({
      accepted: true,
      auctionId: AUCTION_ID,
      paintingNumber: 29,
      paintingCode: 'AEE129',
      startingBid: STARTING_BID,
      minIncrement: MIN_INCREMENT,
      deadline: DEADLINE_ISO,
      closed: false,
      currentBid: result.currentBid,
      currentBidderName: name,
      bids: [{
        name,
        amount,
        createdAt: new Date().toISOString(),
      }],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
