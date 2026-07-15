// TripSit Drug Combination Data - opioids
// Source: https://github.com/TripSit/drugs/blob/main/combos.json
// Auto-generated — do not edit manually.

import type { TripSitCombo } from '../types'

export const opioids_combos: Record<string, TripSitCombo> = {
  "opioids|pcp": {
    "drugA": "pcp",
    "drugB": "opioids",
    "status": "Caution",
    "note": "PCP can reduce opioid tolerance, increasing the risk of overdose",
    "sources": []
  },
  "opioids|pregabalin": {
    "drugA": "pregabalin",
    "drugB": "opioids",
    "status": "Dangerous",
    "note": "",
    "sources": [
      {
        "author": "Eckhardt, K., Ammon, S., Hofmann, U., Riebe, A., Gugeler, N., & Mikus, G. (2000)",
        "title": "Gabapentin enhances the analgesic effect of morphine in healthy volunteers. Anesthesia and Analgesia, 91(1), 185–191.",
        "url": "https://doi.org/10.1097/00000539-200007000-00035"
      },
      {
        "author": "Eipe, N., & Penning, J. (2011)",
        "title": "Postoperative respiratory depression associated with pregabalin: A case series and a preoperative decision algorithm. Pain Research & Management: The Journal of the Canadian Pain Society, 16(5), 353–356.",
        "url": "https://doi.org/10.1155/2011/561604"
      },
      {
        "author": "Elliott, S. P., Burke, T., & Smith, C. (2017)",
        "title": "Determining the Toxicological Significance of Pregabalin in Fatalities. Journal of Forensic Sciences, 62(1), 169–173.",
        "url": "https://doi.org/10.1111/1556-4029.13263"
      },
      {
        "author": "Evoy, K. E., Sadrameli, S., Contreras, J., Covvey, J. R., Peckham, A. M., & Morrison, M. D. (2021)",
        "title": "Abuse and Misuse of Pregabalin and Gabapentin: A Systematic Review Update. Drugs, 81(1), 125–156.",
        "url": "https://doi.org/10.1007/s40265-020-01432-7"
      },
      {
        "author": "Gomes, T., Juurlink, D. N., Antoniou, T., Mamdani, M. M., Paterson, J. M., & Brink, W. van den. (2017)",
        "title": "Gabapentin, opioids, and the risk of opioid-related death: A population-based nested case–control study. PLOS Medicine, 14(10), e1002396.",
        "url": "https://doi.org/10.1371/journal.pmed.1002396"
      },
      {
        "author": "Lyndon, A., Audrey, S., Wells, C., Burnell, E. S., Ingle, S., Hill, R., Hickman, M., & Henderson, G. (2017)",
        "title": "Risk to heroin users of polydrug use of pregabalin or gabapentin: Risks in combining gabapentoids with heroin. Addiction, 112(9), 1580–1589.",
        "url": "https://doi.org/10.1111/add.13843"
      },
      {
        "author": "Peckham, A. M., Evoy, K. E., Covvey, J. R., Ochs, L., Fairman, K. A., & Sclar, D. A. (2018)",
        "title": "Predictors of Gabapentin Overuse With or Without Concomitant Opioids in a Commercially Insured U.S. Population. Pharmacotherapy: The Journal of Human Pharmacology and Drug Therapy, 38(4), 436–443.",
        "url": "https://doi.org/10.1002/phar.2096"
      },
      {
        "author": "Research, C. for D. E. and. (2020)",
        "title": "FDA warns about serious breathing problems with seizure and nerve pain medicines gabapentin (Neurontin, Gralise, Horizant) and pregabalin (Lyrica, Lyrica CR). FDA.",
        "url": "https://www.fda.gov/drugs/drug-safety-and-availability/fda-warns-about-serious-breathing-problems-seizure-and-nerve-pain-medicines-gabapentin-neurontin"
      }
    ]
  },
  "opioids|ssris": {
    "drugA": "ssris",
    "drugB": "opioids",
    "status": "Low Risk & No Synergy",
    "note": "There have been some case reports of serotonin syndrome in individuals who were given a combination of opioids and SSRIs. Other research has indicated a small increase in overdose risk for people who are prescribed CYP2D6-inhibiting SSRIs (e.g. fluoxetine and paroxetine) with oxycodone. Overall, risk is low with this combination but, as always, be mindful of your consumption.",
    "sources": []
  },
  "opioids|tramadol": {
    "drugA": "tramadol",
    "drugB": "opioids",
    "status": "Dangerous",
    "note": "Concomitant use of tramadol increases the seizure risk in individuals taking other opioids. These agents are often individually epileptogenic and may have additive effects on seizure threshold during coadministration. Central nervous system- and/or respiratory-depressant effects may be additively or synergistically present",
    "sources": []
  },
}
