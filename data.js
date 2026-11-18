/*
 * The table: 14 developmental disorders (the columns) by 10 criteria (the rows),
 * in the order of the original document (its Parts 1 to 3, now one table).
 *
 * Each dropdown offers every different answer found in its row, across all 14
 * disorders. "short" is the name used on the buttons that jump to a column.
 * Edit any text here and the game updates itself. No build step.
 */
window.DISORDERS = {
  criteria: ["Etiology", "Gene/Chromosome", "Inheritance/Transmission", "Pathogenesis", "Epidemiology", "Extraoral characteristics", "Facial/Perioral characteristics", "Intraoral characteristics", "Dental implications", "Board Pearls"],
  disorders: [
    {
      name: "Fetal Alcohol Syndrome (FAS)",
      short: "FAS",
      cells: {
        "Etiology": "Consumption of alcohol during pregnancy",
        "Gene/Chromosome": "Not specified",
        "Inheritance/Transmission": "Teratogenic agent",
        "Pathogenesis": "Alcohol crosses the placental barrier; Stored in amniotic fluid",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Growth deficits; neurodevelopmental problems",
        "Facial/Perioral characteristics": "Narrow eyes with epicanthal folds; Short nose with a turned-up end; Thin upper lip with an indistinct flat philtrum area; Cleft lip and/or palate may be present",
        "Intraoral characteristics": "Higher risk of caries and periodontal diseases possible; Cleft lip/palate",
        "Dental implications": "Evaluate for prophylactic antibiotics (congenital heart defects)",
        "Board Pearls": "Clefting risk, thin flat philtrum, evaluate for prophylactic antibiotics due to heart defects"
      }
    },
    {
      name: "TORCH Syndrome",
      short: "TORCH",
      cells: {
        "Etiology": "Toxoplasmosis, Other infections (syphilis, tuberculosis, varicella-zoster virus), Rubella, Cytomegalovirus, Herpesvirus",
        "Gene/Chromosome": "Not specified",
        "Inheritance/Transmission": "Teratogenic agent",
        "Pathogenesis": "Infectious developmental abnormalities",
        "Epidemiology": "1 in 5 live births",
        "Extraoral characteristics": "Severe developmental abnormalities",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Varies by infection",
        "Dental implications": "Varies by infection",
        "Board Pearls": "Accounts for 1 in 5 live births, encompasses multiple teratogenic microorganisms"
      }
    },
    {
      name: "Congenital Syphilis",
      short: "Congenital Syphilis",
      cells: {
        "Etiology": "Congenital infection, maternal",
        "Gene/Chromosome": "Not specified",
        "Inheritance/Transmission": "Teratogenic agent",
        "Pathogenesis": "Affects tooth development",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Not specified",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Hutchinson incisors; Mulberry molars",
        "Dental implications": "Recognize characteristic teeth",
        "Board Pearls": "Hutchinson incisors and mulberry molars"
      }
    },
    {
      name: "Trisomy 21 (Down Syndrome)",
      short: "Trisomy 21",
      cells: {
        "Etiology": "One extra or partial copy of chromosome 21",
        "Gene/Chromosome": "Chromosome 21",
        "Inheritance/Transmission": "Aneuploid usually due to nondisjunction (mosaicism possible)",
        "Pathogenesis": "Extra genetic material, Trisomy 21",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Mild to severe mental deficiency; Short, poor muscle tone (hypotonia); simian crease; Congenital heart defects",
        "Facial/Perioral characteristics": "Midface hypoplasia, open mouth posture",
        "Intraoral characteristics": "Delayed eruption both primary and secondary; Early periodontal disease",
        "Dental implications": "Periodontal monitoring",
        "Board Pearls": "Simian crease, midface hypoplasia, early periodontal disease"
      }
    },
    {
      name: "Klinefelter Syndrome",
      short: "Klinefelter",
      cells: {
        "Etiology": "One or more extra X chromosomes",
        "Gene/Chromosome": "47,XXY",
        "Inheritance/Transmission": "Mosaicism thought to be significant",
        "Pathogenesis": "Extra genetic material, sex chromosome aneuploidy",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Tall with long arms and legs; Lacks sexual development, infertile, gynecomastia; Mitral valve prolapse common",
        "Facial/Perioral characteristics": "Maxillary hypoplasia",
        "Intraoral characteristics": "Tooth and root abnormalities: Taurodontism (40%); Short roots",
        "Dental implications": "Radiographic evaluation",
        "Board Pearls": "47,XXY genotype, 40 percent incidence of taurodontism, gynecomastia, Classic XXY male with taurodontism"
      }
    },
    {
      name: "Turner Syndrome (Monosomy X)",
      short: "Turner",
      cells: {
        "Etiology": "Error in paternal contribution caused by nondisjunction, Monosomy X",
        "Gene/Chromosome": "45,XO",
        "Inheritance/Transmission": "Nondisjunction (mosaicism thought to be significant)",
        "Pathogenesis": "Missing genetic material, Monosomy X",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Short stature (under 5 feet); Webbed neck; low hairline; Wide chest; widely spaced nipples",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "High-arched palate; Small mandible; Permanent teeth may erupt early",
        "Dental implications": "Monitor eruption",
        "Board Pearls": "45,XO genotype, webbed neck, high-arched palate, small mandible, XO female with webbed neck"
      }
    },
    {
      name: "Marfan Syndrome",
      short: "Marfan",
      cells: {
        "Etiology": "Abnormal FBN1 gene (mutation)",
        "Gene/Chromosome": "Chromosome 15",
        "Inheritance/Transmission": "Autosomal dominant (75%), Spontaneous mutation (25%)",
        "Pathogenesis": "Decreased production of fibrillin; Increased flexibility resulting in abnormal stretching",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Very tall/slim, long fingers, aortic aneurysms and mitral valve defects",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "High narrow palate; Class II malocclusion; TMJ dysfunction",
        "Dental implications": "Review cardiovascular history",
        "Board Pearls": "FBN1 gene defect on chromosome 15, aortic aneurysms, high narrow palate, TMJ dysfunction, Arachnodactyly"
      }
    },
    {
      name: "Cleidocranial Dysplasia",
      short: "Cleidocranial",
      cells: {
        "Etiology": "Deletion of DNA on the short arm of chromosome 6",
        "Gene/Chromosome": "Chromosome 6 (RUNX2 gene)",
        "Inheritance/Transmission": "Autosomal dominant",
        "Pathogenesis": "Skeletal developmental disorder",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Short stature; Hypoplastic or missing clavicles, Bossing of the frontal and parietal bones",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Multiple supernumerary teeth; Retained deciduous teeth; delayed eruption of permanent dentition; Lack of cellular cementum; Pseudoanodontia; High narrow palate, cleft palate common",
        "Dental implications": "Eruption Management",
        "Board Pearls": "RUNX2 gene on chromosome 6, missing clavicles (can touch shoulders), multiple supernumerary and retained teeth"
      }
    },
    {
      name: "Treacher Collins Syndrome",
      short: "Treacher Collins",
      cells: {
        "Etiology": "Mutation of TCOF1 gene",
        "Gene/Chromosome": "Chromosome 5",
        "Inheritance/Transmission": "Autosomal dominant",
        "Pathogenesis": "Craniofacial developmental disorder",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Not specified",
        "Facial/Perioral characteristics": "Eyes slant down, lower lip notched; Hypoplastic zygomatic process, mandible, and maxilla; Ears low set/malformed, hearing loss",
        "Intraoral characteristics": "High narrow palate; Cleft lip/palate, Mandibular hypoplasia, Severe open bite malocclusion",
        "Dental implications": "Multidisciplinary care",
        "Board Pearls": "TCOF1 gene on chromosome 5, downward slanting eyes, hypoplastic mandible, severe open bite, normal intelligence"
      }
    },
    {
      name: "Ehlers-Danlos Syndrome",
      short: "Ehlers-Danlos",
      cells: {
        "Etiology": "Production of abnormal collagen results in weak body structures",
        "Gene/Chromosome": "Not specified",
        "Inheritance/Transmission": "Autosomal dominant most common",
        "Pathogenesis": "Abnormal collagen results in weak body structures, weak connective tissues",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Loose joints, joint pain; Hyperelastic, thin loose skin; Fragile skin, mucous membranes, blood vessels",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Gorlin sign; Fragile mucous membranes; Hyperplastic gingival tissues that bleed easily; Malformed teeth, short and/or dilacerated roots",
        "Dental implications": "Short appointments (TMJ dislocation risk), gentle tissue handling",
        "Board Pearls": "Gorlin sign, hyperelastic skin, increased TMJ dislocation risk"
      }
    },
    {
      name: "Papillon-Lefèvre Syndrome",
      short: "Papillon-Lefèvre",
      cells: {
        "Etiology": "Defect in cathepsin C gene",
        "Gene/Chromosome": "Chromosome 11",
        "Inheritance/Transmission": "Autosomal recessive",
        "Pathogenesis": "Severe periodontal destruction",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Hyperkeratosis (Palms of hands, soles of feet); Chronic and recurrent infections",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Severe gingival inflammation with tooth eruption; Primary teeth lost by age 5; Permanent teeth lost by age 15",
        "Dental implications": "Periodontal management",
        "Board Pearls": "Cathepsin C gene on chromosome 11, hyperkeratosis of palms and soles, early loss of both primary and permanent teeth"
      }
    },
    {
      name: "Gingival Fibromatosis",
      short: "Gingival Fibromatosis",
      cells: {
        "Etiology": "Associated with syndromes or defects on chromosomes 2 and 5",
        "Gene/Chromosome": "Chromosomes 2 and 5",
        "Inheritance/Transmission": "Hereditary",
        "Pathogenesis": "Progressive slow overgrowth of gingival connective tissues occurring after eruption of teeth",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Not specified",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Firm, normal-colored gingival tissue covering crowns of teeth; can cause failure or delayed eruption",
        "Dental implications": "Possible surgical management",
        "Board Pearls": "Chromosomes 2 and 5, slow overgrowth of normal-colored gingiva delaying tooth eruption"
      }
    },
    {
      name: "Hypohidrotic Ectodermal Dysplasia (HED)",
      short: "HED",
      cells: {
        "Etiology": "ED1 gene mutation",
        "Gene/Chromosome": "X chromosome",
        "Inheritance/Transmission": "XLHED (X-linked)",
        "Pathogenesis": "Defective ectodermal development",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Sparse or missing hair (hypotrichosis); Absent or few sweat glands (hypohidrosis); Thin, smooth, dry skin; Systemic involvement: Inability to regulate temperature (risk of hyperthermia, seizures, death)",
        "Facial/Perioral characteristics": "Not specified",
        "Intraoral characteristics": "Anodontia or hypodontia (missing teeth); Small, conical (peg-shaped) teeth; Severe xerostomia",
        "Dental implications": "High risk, early prosthetic appliances/dentures needed",
        "Board Pearls": "ED1 gene on X chromosome, conical peg-shaped teeth, hypodontia, hypohidrosis causing hyperthermia risk"
      }
    },
    {
      name: "Cherubism",
      short: "Cherubism",
      cells: {
        "Etiology": "Mutation in SH3BP2 gene",
        "Gene/Chromosome": "Chromosome 4",
        "Inheritance/Transmission": "Autosomal dominant",
        "Pathogenesis": "Bone resorbed and replaced with fibrous tissue; Self-limiting (regresses or resolves by age 30)",
        "Epidemiology": "Not specified",
        "Extraoral characteristics": "Not specified",
        "Facial/Perioral characteristics": "Painless enlargement of facial bones (mandible greater than maxilla); Swollen cheeks; Upward tilt of eyes (cherub look)",
        "Intraoral characteristics": "Premature loss of primary teeth, delayed eruption of permanent teeth; Multiple, well-defined, multilocular, radiolucent lesions in maxilla and mandible",
        "Dental implications": "Long-term orthodontic and prosthetic management",
        "Board Pearls": "SH3BP2 gene on chromosome 4, self-limiting condition by age 30, multilocular radiolucent lesions"
      }
    }
  ]
};
