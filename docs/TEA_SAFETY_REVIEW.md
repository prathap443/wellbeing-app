# Tea rituals: safety and wording review

_The text below is exactly what users see in the app (from `src/lib/teas.ts`). Each line has been checked against a public source, shown underneath it in italics, so the review should take about 15 minutes. Please tick each line you are happy with, or write a change next to it._

_Who should review: a registered pharmacist (GPhC) or a GP. Until this is signed, nothing in the app or the App Store listing may say the content was professionally reviewed (as of v1.4 nothing does)._

**Reviewer:** ____________________  **Qualification and registration number:** ____________________  **Date:** __________

**Sources used** (numbers are referred to below)

1. NCCIH, Chamomile: https://www.nccih.nih.gov/health/chamomile
2. NCCIH, Peppermint oil (includes peppermint tea): https://www.nccih.nih.gov/health/peppermint-oil
3. NCCIH, Ginger: https://www.nccih.nih.gov/health/ginger
4. EMA HMPC monograph, Melissa officinalis leaf (lemon balm): https://www.ema.europa.eu/en/medicines/herbal/melissae-folium
5. EMA HMPC monograph, Lavandula angustifolia flower: https://www.ema.europa.eu/en/medicines/herbal/lavandulae-flos
6. EMA HMPC monograph, Tilia flower (linden): https://www.ema.europa.eu/en/documents/herbal-monograph/final-community-herbal-monograph-tilia-cordata-miller-tilia-platyphyllos-scop-tilia-x-vulgaris-heyne_en.pdf
7. Drugs.com professional monograph, Linden (citing German Commission E): https://www.drugs.com/npp/linden.html
8. Case report, possible hepatotoxic effect of rooibos tea (2010): https://pubmed.ncbi.nlm.nih.gov/20072844/ and NIH LiverTox (Buchu entry, combined buchu and rooibos case): https://www.ncbi.nlm.nih.gov/books/NBK589899/
9. Case report, ginger and raised INR on warfarin: https://pmc.ncbi.nlm.nih.gov/articles/PMC6594244

## Shown on every tea

- [ ] These teas are a calming ritual, not a treatment for anxiety or any other condition.
  _Matches the evidence notes below: none of these teas has good evidence as a treatment._
- [ ] If you are pregnant, breastfeeding or take regular medication, check with a pharmacist or your GP first.
  _The EMA monographs for lemon balm, lavender and linden say "use during pregnancy and lactation is not recommended", because safety has not been established [4, 5, 6]. "Check first" is the softer consumer version. **Reviewer: decide whether pregnancy should instead say "avoid lemon balm, lavender and linden".**_
- [ ] Stop drinking it if you notice any reaction, such as a rash, itching or stomach upset.
  _A general precaution. The EMA monographs say "if adverse reactions occur, a doctor or qualified health care practitioner should be consulted" [4, 5, 6]._

## Deliberately excluded

- St John's wort, kava, valerian, ashwagandha, hibiscus: interaction or safety concerns for people on mental-health or blood-pressure medication.

## Chamomile (free)

- [ ] **About:** One of the most familiar evening teas. Traditionally used to help people relax before sleep.
- [ ] **Evidence label:** Some small studies
- [ ] **Evidence note:** A few small studies of chamomile suggest it may ease mild tension. Most used concentrated extracts rather than tea.
  _NCCIH: "some preliminary studies suggest that a chamomile dietary supplement might be helpful for generalized anxiety disorder"; very little information for insomnia [1]. Consistent._
- [ ] **Brewing:** 1 tea bag or 1 to 2 teaspoons of dried flowers. Freshly boiled water. About 5 minutes.
- [ ] **Caution:** Avoid if you are allergic to plants in the daisy family, such as ragweed, marigold or echinacea.
  _NCCIH: allergic reactions are more likely in people allergic to related plants such as ragweed, chrysanthemums, marigolds and daisies [1]. Consistent._
- [ ] **Caution:** If you take blood thinners such as warfarin, check with a pharmacist first.
  _NCCIH: interactions reported between chamomile and warfarin, and some drugs metabolised by the liver [1]. Consistent._

## Peppermint (free)

- [ ] **About:** A bright, refreshing tea. Traditionally enjoyed after meals and as a fresh pause in the day.
- [ ] **Evidence label:** Traditional use
- [ ] **Evidence note:** Enjoyed for its fresh taste and aroma. There is little research on peppermint tea for calm itself.
- [ ] **Brewing:** 1 tea bag, or a small handful of fresh leaves. Freshly boiled water. About 5 minutes.
- [ ] **Caution:** It can make heartburn or reflux worse in some people.
  _NCCIH: peppermint tea "appears to be safe"; oral peppermint can cause heartburn and acid reflux [2]. Consistent (the source data is mostly for the oil)._

## Lemon balm (Plus)

- [ ] **About:** A lemony herb from the mint family. Traditionally used for a calm, clear-headed feeling.
- [ ] **Evidence label:** Some small studies
- [ ] **Evidence note:** A few small studies of lemon balm suggest it may support calm. Most used extracts rather than tea.
- [ ] **Brewing:** 1 tea bag or 1 to 2 teaspoons of dried leaves. Freshly boiled water. About 6 minutes.
  _EMA tea dose is 1.5 to 4.5 g in 150 ml, 1 to 3 times a day [4]. 1 to 2 teaspoons is within this range._
- [ ] **Caution:** If you take thyroid medication, check with a pharmacist first.
  _EMA, non-clinical section: the water extract "may inhibit the activity of TSH"; clinical relevance unknown [4]. Precautionary, which is reasonable._
- [ ] **Caution:** It may add to the effect of sleep or sedative medicines.
  _EMA: interactions "no data available", but it "may impair ability to drive and use machines" [4]. The sedative line is a reasonable precaution._
- [ ] **Suggested addition:** It can make some people drowsy. Don't drive if it affects you.
  _Based on EMA section 4.7 [4]. Not in the app yet; if you agree, it is added in the next build._

## Lavender (Plus)

- [ ] **About:** A floral evening tea. Traditionally used to create a soothing, slow-down moment.
- [ ] **Evidence label:** Traditional use
- [ ] **Evidence note:** Research on lavender mostly used concentrated oil capsules, not tea, so it does not apply directly to a cup of lavender tea.
- [ ] **Brewing:** Half a teaspoon of food-grade (culinary) dried lavender. Freshly boiled water. About 5 minutes.
  _EMA tea dose is 1 to 2 g in 150 ml [5]. Half a teaspoon is at or below this, which is deliberate for taste._
- [ ] **Caution:** Use only food-grade lavender, never lavender oil or flowers from a florist.
- [ ] **Caution:** A little goes a long way: too much tastes soapy.
- [ ] **Caution:** It may add to the effect of sleep or sedative medicines.
  _EMA: interactions "none reported", but it "may impair ability to drive and use machines" [5]. Precautionary, which is reasonable._
- [ ] **Suggested addition:** It can make some people drowsy. Don't drive if it affects you.
  _Based on EMA section 4.7 [5]. Not in the app yet._

## Rooibos (Plus)

- [ ] **About:** A red bush tea from South Africa with a mellow, slightly sweet taste. A good caffeine-free swap for a regular cuppa.
- [ ] **Evidence label:** Traditional use
- [ ] **Evidence note:** Valued as a caffeine-free comfort drink. There is little research on it for calm.
- [ ] **Brewing:** 1 tea bag or 1 teaspoon of loose rooibos. Freshly boiled water. About 6 minutes.
- [ ] **Caution:** Generally well tolerated. If you have liver problems, check with a pharmacist first.
  _Based on isolated case reports only [8]. LiverTox notes the one combined case can't be pinned on rooibos. Very cautious; the reviewer may keep it or remove it._

## Linden flower (Plus)

- [ ] **About:** Made from lime-tree blossoms. A traditional European evening tea for a gentle, quiet moment.
- [ ] **Evidence label:** Traditional use
- [ ] **Evidence note:** A long tradition of use, but very little modern research.
- [ ] **Brewing:** 1 tea bag or 1 to 2 teaspoons of dried blossoms. Freshly boiled water. About 7 minutes.
  _EMA tea dose is 1.5 g in 150 ml, 2 to 4 times a day [6]. Consistent._
- [ ] **Caution:** If you have a heart condition or take heart medication, check with a pharmacist first.
  _Not in the EMA monograph, which lists no warnings, interactions or side effects [6]. It comes from the older German Commission E view that frequent use may affect the heart, which has no recent clinical data [7]. Precautionary; keep or remove at the reviewer's discretion._

## Ginger & lemon (Plus)

- [ ] **About:** Fresh ginger and lemon in hot water. A warming, comforting cup that is simple to make.
- [ ] **Evidence label:** Traditional use
- [ ] **Evidence note:** Enjoyed for its warmth. Ginger is studied for nausea, not for calm.
  _NCCIH: research focuses on nausea [3]. Consistent._
- [ ] **Brewing:** 3 to 4 thin slices of fresh ginger and a slice of lemon. Freshly boiled water. About 7 minutes.
- [ ] **Caution:** If you take blood thinners or have gallstones, check with a pharmacist first.
  _Blood thinners: case report of raised INR with ginger on warfarin [9]. NCCIH advises asking a health professional if you take any medicine [3]. Gallstones: a traditional (Commission E) precaution; NCCIH does not mention it. Precautionary._
- [ ] **Caution:** It can make heartburn worse in some people.
  _NCCIH lists heartburn as a side effect [3]. Consistent._

## Rose petal (Plus)

- [ ] **About:** A light, fragrant tea made from dried rose petals. A lovely, unhurried cup to slow down with.
- [ ] **Evidence label:** Traditional use
- [ ] **Evidence note:** Enjoyed for its fragrance. There is very little research on it for calm.
- [ ] **Brewing:** 1 tablespoon of food-grade dried rose petals. Hot water, just off the boil. About 5 minutes.
- [ ] **Caution:** Use only food-grade petals: roses from florists or gardens may have been sprayed.

## The guided ritual (same for every tea)

1. **Hold the cup:** Wrap both hands around it. Notice the warmth spreading into your palms.
2. **Breathe it in:** Bring the cup close and breathe in slowly through your nose. What do you notice in the aroma?
3. **A first sip:** Take a small sip and let it rest on your tongue for a moment before you swallow.
4. **Look around:** Notice one thing you can see, one thing you can hear, and one thing you can feel.
5. **Let go a little:** Take another slow sip. As you breathe out, let your shoulders drop.

- [ ] The ritual wording is fine. (Note that the water is freshly boiled: step 1 asks people to hold the cup, so the reviewer may want "once it's cool enough to hold".)

## Sign-off

- [ ] I have reviewed the content above and, with the changes I have marked, it is suitable as general consumer information for adults.

Signature: ____________________
