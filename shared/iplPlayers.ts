import type { FranchiseId, IplPlayer, PlayerRole } from "./types";

type RosterEntry = readonly [name: string, role: PlayerRole];

// October 30, 2026 manually maintained snapshot; update after the IPL 2027 auction.
const roster: Record<FranchiseId, readonly RosterEntry[]> = {
  CSK: [
    ["Ruturaj Gaikwad", "batter"], ["Ayush Mhatre", "batter"], ["Dewald Brevis", "batter"],
    ["MS Dhoni", "wicketkeeper-batter"], ["Urvil Patel", "wicketkeeper-batter"], ["Shivam Dube", "all-rounder"],
    ["Jamie Overton", "all-rounder"], ["Ramakrishna Ghosh", "all-rounder"], ["Noor Ahmad", "bowler"],
    ["Khaleel Ahmed", "bowler"], ["Anshul Kamboj", "bowler"], ["Gurjapneet Singh", "bowler"],
    ["Nathan Ellis", "bowler"], ["Shreyas Gopal", "all-rounder"], ["Mukesh Choudhary", "bowler"],
    ["Sanju Samson", "wicketkeeper-batter"], ["Akeal Hosein", "bowler"], ["Prashant Veer", "all-rounder"],
    ["Kartik Sharma", "wicketkeeper-batter"], ["Matthew Short", "all-rounder"], ["Aman Khan", "all-rounder"],
    ["Sarfaraz Khan", "batter"], ["Matt Henry", "bowler"], ["Rahul Chahar", "bowler"], ["Zak Foulkes", "all-rounder"]
  ],
  DC: [
    ["Axar Patel", "all-rounder"], ["KL Rahul", "wicketkeeper-batter"], ["Tristan Stubbs", "wicketkeeper-batter"],
    ["Sameer Rizvi", "batter"], ["Karun Nair", "batter"], ["Abishek Porel", "wicketkeeper-batter"],
    ["Ashutosh Sharma", "batter"], ["Vipraj Nigam", "all-rounder"], ["Madhav Tiwari", "all-rounder"],
    ["Tripurana Vijay", "all-rounder"], ["Ajay Mandal", "all-rounder"], ["Mitchell Starc", "bowler"],
    ["Mukesh Kumar", "bowler"], ["Dushmantha Chameera", "bowler"], ["Nitish Rana", "batter"],
    ["Auqib Nabi Dar", "bowler"], ["Pathum Nissanka", "batter"], ["Kyle Jamieson", "bowler"],
    ["Lungi Ngidi", "bowler"], ["Ben Duckett", "wicketkeeper-batter"], ["David Miller", "batter"],
    ["Prithvi Shaw", "batter"], ["Sahil Parakh", "batter"], ["Rishabh Pant", "wicketkeeper-batter"],
    ["Zeeshan Ansari", "bowler"]
  ],
  GT: [
    ["Shubman Gill", "batter"], ["Rashid Khan", "bowler"], ["Sai Sudharsan", "batter"],
    ["Rahul Tewatia", "all-rounder"], ["Shahrukh Khan", "batter"], ["Kagiso Rabada", "bowler"],
    ["Jos Buttler", "wicketkeeper-batter"], ["Mohammed Siraj", "bowler"], ["Prasidh Krishna", "bowler"],
    ["Nishant Sindhu", "all-rounder"], ["Kumar Kushagra", "wicketkeeper-batter"], ["Anuj Rawat", "wicketkeeper-batter"],
    ["Manav Suthar", "bowler"], ["Washington Sundar", "all-rounder"], ["Arshad Khan", "all-rounder"],
    ["Gurnoor Singh Brar", "bowler"], ["R. Sai Kishore", "bowler"], ["Ishant Sharma", "bowler"],
    ["Jayant Yadav", "all-rounder"], ["Glenn Phillips", "wicketkeeper-batter"], ["Jason Holder", "all-rounder"],
    ["Ashok Sharma", "bowler"], ["Tom Banton", "wicketkeeper-batter"], ["Prithvi Raj Yarra", "bowler"],
    ["Luke Wood", "bowler"]
  ],
  KKR: [
    ["Ajinkya Rahane", "batter"], ["Angkrish Raghuvanshi", "batter"], ["Anukul Roy", "all-rounder"],
    ["Harshit Rana", "bowler"], ["Manish Pandey", "batter"], ["Ramandeep Singh", "all-rounder"],
    ["Rinku Singh", "batter"], ["Rovman Powell", "batter"], ["Sunil Narine", "all-rounder"],
    ["Umran Malik", "bowler"], ["Vaibhav Arora", "bowler"], ["Varun Chakravarthy", "bowler"],
    ["Cameron Green", "all-rounder"], ["Matheesha Pathirana", "bowler"], ["Mustafizur Rahman", "bowler"],
    ["Tejasvi Singh", "batter"], ["Rachin Ravindra", "all-rounder"], ["Finn Allen", "wicketkeeper-batter"],
    ["Tim Seifert", "wicketkeeper-batter"], ["Akash Deep", "bowler"], ["Rahul Tripathi", "batter"],
    ["Daksh Kamra", "all-rounder"], ["Sarthak Ranjan", "batter"], ["Prashant Solanki", "bowler"],
    ["Kartik Tyagi", "bowler"]
  ],
  LSG: [
    ["Kuldeep Yadav", "bowler"], ["Abdul Samad", "batter"], ["Ayush Badoni", "batter"],
    ["Aiden Markram", "batter"], ["Mitchell Marsh", "all-rounder"], ["Matthew Breetzke", "batter"],
    ["Nicholas Pooran", "wicketkeeper-batter"], ["Himmat Singh", "batter"], ["Shahbaz Ahmed", "all-rounder"],
    ["Arshin Kulkarni", "all-rounder"], ["Mayank Yadav", "bowler"], ["Avesh Khan", "bowler"],
    ["Mohsin Khan", "bowler"], ["Digvesh Rathi", "bowler"], ["Manimaran Siddharth", "bowler"],
    ["Prince Yadav", "bowler"], ["Akash Singh", "bowler"], ["Arjun Tendulkar", "all-rounder"],
    ["Mohammed Shami", "bowler"], ["Naman Tiwari", "bowler"], ["Wanindu Hasaranga", "all-rounder"],
    ["Josh Inglis", "wicketkeeper-batter"], ["Akshat Raghuwanshi", "batter"], ["Anrich Nortje", "bowler"],
    ["Mukul Choudhary", "wicketkeeper-batter"]
  ],
  MI: [
    ["Rohit Sharma", "batter"], ["Suryakumar Yadav", "batter"], ["Tilak Varma", "batter"],
    ["Robin Minz", "wicketkeeper-batter"], ["Ryan Rickelton", "wicketkeeper-batter"], ["Hardik Pandya", "all-rounder"],
    ["Naman Dhir", "all-rounder"], ["Mitchell Santner", "all-rounder"], ["Will Jacks", "all-rounder"],
    ["Corbin Bosch", "all-rounder"], ["Raj Angad Bawa", "all-rounder"], ["Trent Boult", "bowler"],
    ["Jasprit Bumrah", "bowler"], ["Deepak Chahar", "bowler"], ["Ashwani Kumar", "bowler"],
    ["Raghu Sharma", "bowler"], ["Allah Ghazanfar", "bowler"], ["Shardul Thakur", "all-rounder"],
    ["Sherfane Rutherford", "all-rounder"], ["Mayank Markande", "bowler"], ["Quinton de Kock", "wicketkeeper-batter"],
    ["Danish Malewar", "batter"], ["Mohammad Izhar", "bowler"], ["Atharva Ankolekar", "all-rounder"],
    ["Mayank Rawat", "all-rounder"]
  ],
  PBKS: [
    ["Shreyas Iyer", "batter"], ["Nehal Wadhera", "batter"], ["Priyansh Arya", "batter"],
    ["Prabhsimran Singh", "wicketkeeper-batter"], ["Shashank Singh", "batter"], ["Pyla Avinash", "batter"],
    ["Harnoor Pannu", "batter"], ["Musheer Khan", "all-rounder"], ["Vishnu Vinod", "wicketkeeper-batter"],
    ["Marcus Stoinis", "all-rounder"], ["Azmatullah Omarzai", "all-rounder"], ["Suryansh Shedge", "all-rounder"],
    ["Mitch Owen", "all-rounder"], ["Arshdeep Singh", "bowler"], ["Vyshak Vijaykumar", "bowler"],
    ["Marco Jansen", "all-rounder"], ["Yash Thakur", "bowler"], ["Xavier Bartlett", "bowler"],
    ["Lockie Ferguson", "bowler"], ["Yuzvendra Chahal", "bowler"], ["Harpreet Brar", "all-rounder"],
    ["Ben Dwarshuis", "bowler"], ["Cooper Connolly", "all-rounder"], ["Pravin Dubey", "bowler"],
    ["Vishal Nishad", "bowler"]
  ],
  RR: [
    ["Yashasvi Jaiswal", "batter"], ["Vaibhav Suryavanshi", "batter"], ["Dhruv Jurel", "wicketkeeper-batter"],
    ["Riyan Parag", "all-rounder"], ["Shimron Hetmyer", "batter"], ["Shubham Dubey", "batter"],
    ["Yudhvir Singh Charak", "all-rounder"], ["Jofra Archer", "bowler"], ["Tushar Deshpande", "bowler"],
    ["Sandeep Sharma", "bowler"], ["Kwena Maphaka", "bowler"], ["Nandre Burger", "bowler"],
    ["Lhuan-dre Pretorius", "wicketkeeper-batter"], ["Ravindra Jadeja", "all-rounder"],
    ["Donovan Ferreira", "wicketkeeper-batter"], ["Sam Curran", "all-rounder"], ["Ravi Bishnoi", "bowler"],
    ["Ravi Singh", "wicketkeeper-batter"], ["Sushant Mishra", "bowler"], ["Brijesh Sharma", "bowler"],
    ["Aman Rao Perala", "batter"], ["Vignesh Puthur", "bowler"], ["Yash Raj Punja", "all-rounder"],
    ["Kuldeep Sen", "bowler"], ["Adam Milne", "bowler"]
  ],
  RCB: [
    ["Rajat Patidar", "batter"], ["Virat Kohli", "batter"], ["Devdutt Padikkal", "batter"],
    ["Phil Salt", "wicketkeeper-batter"], ["Jitesh Sharma", "wicketkeeper-batter"], ["Krunal Pandya", "all-rounder"],
    ["Swapnil Singh", "all-rounder"], ["Tim David", "batter"], ["Romario Shepherd", "all-rounder"],
    ["Jacob Bethell", "all-rounder"], ["Josh Hazlewood", "bowler"], ["Yash Dayal", "bowler"],
    ["Bhuvneshwar Kumar", "bowler"], ["Nuwan Thushara", "bowler"], ["Rasikh Salam", "bowler"],
    ["Abhinandan Singh", "bowler"], ["Suyash Sharma", "bowler"], ["Venkatesh Iyer", "all-rounder"],
    ["Jacob Duffy", "bowler"], ["Satvik Deswal", "bowler"], ["Mangesh Yadav", "bowler"],
    ["Jordan Cox", "wicketkeeper-batter"], ["Vicky Ostwal", "bowler"], ["Kanishk Chouhan", "all-rounder"],
    ["Vihaan Malhotra", "all-rounder"]
  ],
  SRH: [
    ["Pat Cummins", "bowler"], ["Travis Head", "batter"], ["Abhishek Sharma", "all-rounder"],
    ["Aniket Verma", "batter"], ["Smaran Ravichandran", "batter"], ["Ishan Kishan", "wicketkeeper-batter"],
    ["Heinrich Klaasen", "wicketkeeper-batter"], ["Nitish Kumar Reddy", "all-rounder"], ["Harsh Dubey", "all-rounder"],
    ["Kamindu Mendis", "all-rounder"], ["Harshal Patel", "bowler"], ["Brydon Carse", "all-rounder"],
    ["Jaydev Unadkat", "bowler"], ["Eshan Malinga", "bowler"], ["Liam Livingstone", "all-rounder"],
    ["Jack Edwards", "all-rounder"], ["Salil Arora", "wicketkeeper-batter"], ["Shivam Mavi", "bowler"],
    ["Krains Fuletra", "bowler"], ["Praful Hinge", "bowler"], ["Amit Kumar", "bowler"],
    ["Onkar Tarmale", "bowler"], ["Sakib Hussain", "bowler"], ["Shivang Kumar", "all-rounder"],
    ["T. Natarajan", "bowler"]
  ]
};

const existingIds: Record<string, string> = {
  "Ruturaj Gaikwad": "csk-ruturaj", "MS Dhoni": "csk-ms-dhoni", "Shivam Dube": "csk-shivam",
  "Ravindra Jadeja": "csk-ravindra", "Matheesha Pathirana": "csk-matheesha",
  "Rahul Tripathi": "csk-rahul", "Noor Ahmad": "csk-noor", "Axar Patel": "dc-axar", "KL Rahul": "dc-kl",
  "Tristan Stubbs": "dc-tristan", "Abishek Porel": "dc-abishek", "Vipraj Nigam": "dc-vipraj",
  "Nitish Rana": "dc-nitish", "Mitchell Starc": "dc-mitchell", "Mukesh Kumar": "dc-mukesh",
  "Kuldeep Yadav": "dc-kuldeep", "Shubman Gill": "gt-shubman", "Rashid Khan": "gt-rashid",
  "Sai Sudharsan": "gt-sai", "Rahul Tewatia": "gt-rahul-tewatia", "Shahrukh Khan": "gt-shahrukh",
  "Kagiso Rabada": "gt-kagiso", "Jos Buttler": "gt-jos", "Mohammed Siraj": "gt-mohammed",
  "Prasidh Krishna": "gt-prasidh", "Washington Sundar": "gt-washington",
  "Ajinkya Rahane": "kkr-ajinkya", "Rinku Singh": "kkr-rinku", "Sunil Narine": "kkr-sunil",
  "Varun Chakravarthy": "kkr-varun", "Harshit Rana": "kkr-harshit", "Ramandeep Singh": "kkr-ramandeep",
  "Quinton de Kock": "kkr-quinton", "Venkatesh Iyer": "kkr-v-a", "Rishabh Pant": "lsg-rishabh",
  "Nicholas Pooran": "lsg-nicholas", "Mayank Yadav": "lsg-mayank", "Avesh Khan": "lsg-avesh",
  "Mohsin Khan": "lsg-mohsin", "Ayush Badoni": "lsg-ayush", "Mitchell Marsh": "lsg-marshal",
  "David Miller": "lsg-david", "Shardul Thakur": "lsg-shardul", "Abdul Samad": "lsg-abdul",
  "Rohit Sharma": "mi-rohit", "Hardik Pandya": "mi-hardik", "Suryakumar Yadav": "mi-suryakumar",
  "Jasprit Bumrah": "mi-jasprit", "Tilak Varma": "mi-tilak", "Ryan Rickelton": "mi-ryan",
  "Trent Boult": "mi-trent", "Dewald Brevis": "mi-dewald", "Mitchell Santner": "mi-mitchell-s",
  "Deepak Chahar": "mi-deepak-c", "Shreyas Iyer": "pbks-shreyas", "Arshdeep Singh": "pbks-arshdeep",
  "Yuzvendra Chahal": "pbks-yuzvendra", "Marco Jansen": "pbks-marco",
  "Prabhsimran Singh": "pbks-prabhsimran", "Nehal Wadhera": "pbks-nehal",
  "Shashank Singh": "pbks-shashank", "Lockie Ferguson": "pbks-lockie", "Harpreet Brar": "pbks-harpreet",
  "Sanju Samson": "rr-sanju", "Yashasvi Jaiswal": "rr-yashasvi", "Riyan Parag": "rr-riyan", "Dhruv Jurel": "rr-dhruv",
  "Jofra Archer": "rr-jofra", "Sandeep Sharma": "rr-sandeep", "Shimron Hetmyer": "rr-shimron",
  "Rajat Patidar": "rcb-rajat", "Virat Kohli": "rcb-virat", "Phil Salt": "rcb-phil",
  "Jitesh Sharma": "rcb-jitesh", "Krunal Pandya": "rcb-krunal", "Tim David": "rcb-tim",
  "Romario Shepherd": "rcb-romario", "Josh Hazlewood": "rcb-josh", "Bhuvneshwar Kumar": "rcb-bhuvi",
  "Suyash Sharma": "rcb-suyash", "Pat Cummins": "srh-pat", "Travis Head": "srh-travis",
  "Abhishek Sharma": "srh-abhishek", "Heinrich Klaasen": "srh-heinrich",
  "Ishan Kishan": "srh-isha", "Nitish Kumar Reddy": "srh-nitish-k", "Harshal Patel": "srh-harshal",
  "Mohammed Shami": "srh-mohammed-s"
};

function stableId(name: string, franchiseId: FranchiseId): string {
  return existingIds[name] ?? `${franchiseId.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export const IPL_PLAYERS: IplPlayer[] = Object.entries(roster).flatMap(([franchiseId, players]) =>
  players.map(([name, role]) => ({
    id: stableId(name, franchiseId as FranchiseId),
    name,
    franchiseId: franchiseId as FranchiseId,
    role
  }))
);
