
router.get('/cost-summary', authMiddleware, async (req, res) => {
  try {
    const licenses = await License.find().populate({
      path: 'product',
      match: { user: req.user.id }
    });

    let monthly = 0, yearly = 0, upcoming = 0;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const lic of licenses) {
      if (!lic.product) continue;
      if (lic.costFrequency === 'monthly') monthly += lic.cost;
      if (lic.costFrequency === 'yearly') yearly += lic.cost;

      if (lic.expiryDate && new Date(lic.expiryDate) <= in30Days) {
        upcoming += lic.cost;
      }
    }

    res.json({
      monthlySpend: monthly,
      yearlySpend: yearly,
      next30DayRenewal: upcoming
    });
  } catch (err) {
    console.error('Cost summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
