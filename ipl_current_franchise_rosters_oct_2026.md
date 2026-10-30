# IPL Draft Arena --- Franchise Player Roster Reference

**Snapshot date:** 30 October 2026\
**Purpose:** Source-of-truth reference for the player pool in IPL Draft
Arena. Use these players and franchise assignments when updating the
application's local roster data.

> **Important scope note:** This is the full 25-player roster baseline
> after the IPL 2026 auction, adjusted for officially announced player
> trades for IPL 2027 that were confirmed by 30 October 2026. It is
> **not** a claim that IPL 2027 final squads are already settled: the
> upcoming auction and any later official trades/releases can change
> them. Recheck the official IPL website before the 2027 auction and
> update this file after the auction.

## How Copilot should use this file

1.  Treat the franchise lists below as the authoritative roster mapping
    for the current app update.
2.  Update the existing local player dataset (expected file:
    `server/src/data/iplPlayers.ts`, or the actual equivalent discovered
    in the repository) so each listed player appears exactly once and
    belongs to the franchise shown here.
3.  Preserve the app's existing player-data schema and IDs where
    possible. Use stable IDs such as `csk-ms-dhoni` or
    `srh-t-natarajan`; do not use array indexes as IDs.
4.  Do not add released players, rumours, or players from old seasons
    unless they are listed below.
5.  Do not rely on remote APIs or remote images. The app must keep
    working offline from the local roster data.
6.  If the app requires player roles, use a best-effort role
    classification based on reliable cricket knowledge, but keep the
    name and franchise assignment exactly as listed. If uncertain, use
    the app's neutral/unknown role rather than inventing a specialist
    role.
7.  Keep all ten franchise identities available to the spin wheel.
    Ensure the player pool contains at least 96 unique players so eight
    users can each draft 12 players without the pool running out. This
    roster has far more than 96 players.
8.  Add a roster source note in the code or README with this snapshot
    date. Do not display source notes in the game UI unless there is
    already a suitable place for them.

## Confirmed IPL 2027 trades reflected in this snapshot

  --------------------------------------------------------------------------
  Date announced Player         Previous       New franchise  Status
                                franchise
  -------------- -------------- -------------- -------------- --------------
  23 June 2026   Rishabh Pant   Lucknow Super  Delhi Capitals Officially
                                Giants (LSG)   (DC)           announced

  23 June 2026   Kuldeep Yadav  Delhi Capitals Lucknow Super  Officially
                                (DC)           Giants (LSG)   announced

  14 October     T. Natarajan   Delhi Capitals Sunrisers      Officially
  2026                          (DC)           Hyderabad      announced
                                               (SRH)

  14 October     Zeeshan Ansari Sunrisers      Delhi Capitals Officially
  2026                          Hyderabad      (DC)           announced
                                (SRH)
  --------------------------------------------------------------------------

The 2026 auction squads below already include the earlier transactions
that formed those squads (for example Sanju Samson to CSK; Ravindra
Jadeja and Sam Curran to RR; Nitish Rana to DC; and Shardul Thakur,
Sherfane Rutherford, and Mayank Markande to MI). Do not apply those
historical transactions a second time.

------------------------------------------------------------------------

## 1. Chennai Super Kings (CSK)

1.  Ruturaj Gaikwad
2.  Ayush Mhatre
3.  Dewald Brevis
4.  MS Dhoni
5.  Urvil Patel
6.  Shivam Dube
7.  Jamie Overton
8.  Ramakrishna Ghosh
9.  Noor Ahmad
10. Khaleel Ahmed
11. Anshul Kamboj
12. Gurjapneet Singh
13. Nathan Ellis
14. Shreyas Gopal
15. Mukesh Choudhary
16. Sanju Samson
17. Akeal Hosein
18. Prashant Veer
19. Kartik Sharma
20. Matthew Short
21. Aman Khan
22. Sarfaraz Khan
23. Matt Henry
24. Rahul Chahar
25. Zak Foulkes

## 2. Delhi Capitals (DC)

This list includes Rishabh Pant and Zeeshan Ansari, and excludes Kuldeep
Yadav and T. Natarajan following the confirmed 2026 trades.

1.  Axar Patel
2.  KL Rahul
3.  Tristan Stubbs
4.  Sameer Rizvi
5.  Karun Nair
6.  Abishek Porel
7.  Ashutosh Sharma
8.  Vipraj Nigam
9.  Madhav Tiwari
10. Tripurana Vijay
11. Ajay Mandal
12. Mitchell Starc
13. Mukesh Kumar
14. Dushmantha Chameera
15. Nitish Rana
16. Auqib Nabi Dar
17. Pathum Nissanka
18. Kyle Jamieson
19. Lungi Ngidi
20. Ben Duckett
21. David Miller
22. Prithvi Shaw
23. Sahil Parakh
24. Rishabh Pant
25. Zeeshan Ansari

## 3. Gujarat Titans (GT)

1.  Shubman Gill
2.  Rashid Khan
3.  Sai Sudharsan
4.  Rahul Tewatia
5.  Shahrukh Khan
6.  Kagiso Rabada
7.  Jos Buttler
8.  Mohammed Siraj
9.  Prasidh Krishna
10. Nishant Sindhu
11. Kumar Kushagra
12. Anuj Rawat
13. Manav Suthar
14. Washington Sundar
15. Arshad Khan
16. Gurnoor Singh Brar
17. R. Sai Kishore
18. Ishant Sharma
19. Jayant Yadav
20. Glenn Phillips
21. Jason Holder
22. Ashok Sharma
23. Tom Banton
24. Prithvi Raj Yarra
25. Luke Wood

## 4. Kolkata Knight Riders (KKR)

1.  Ajinkya Rahane
2.  Angkrish Raghuvanshi
3.  Anukul Roy
4.  Harshit Rana
5.  Manish Pandey
6.  Ramandeep Singh
7.  Rinku Singh
8.  Rovman Powell
9.  Sunil Narine
10. Umran Malik
11. Vaibhav Arora
12. Varun Chakravarthy
13. Cameron Green
14. Matheesha Pathirana
15. Mustafizur Rahman
16. Tejasvi Singh
17. Rachin Ravindra
18. Finn Allen
19. Tim Seifert
20. Akash Deep
21. Rahul Tripathi
22. Daksh Kamra
23. Sarthak Ranjan
24. Prashant Solanki
25. Kartik Tyagi

## 5. Lucknow Super Giants (LSG)

This list includes Kuldeep Yadav and excludes Rishabh Pant following the
confirmed June 2026 trade.

1.  Kuldeep Yadav
2.  Abdul Samad
3.  Ayush Badoni
4.  Aiden Markram
5.  Mitchell Marsh
6.  Matthew Breetzke
7.  Nicholas Pooran
8.  Himmat Singh
9.  Shahbaz Ahmed
10. Arshin Kulkarni
11. Mayank Yadav
12. Avesh Khan
13. Mohsin Khan
14. Digvesh Rathi
15. Manimaran Siddharth
16. Prince Yadav
17. Akash Singh
18. Arjun Tendulkar
19. Mohammed Shami
20. Naman Tiwari
21. Wanindu Hasaranga
22. Josh Inglis
23. Akshat Raghuwanshi
24. Anrich Nortje
25. Mukul Choudhary

## 6. Mumbai Indians (MI)

1.  Rohit Sharma
2.  Suryakumar Yadav
3.  Tilak Varma
4.  Robin Minz
5.  Ryan Rickelton
6.  Hardik Pandya
7.  Naman Dhir
8.  Mitchell Santner
9.  Will Jacks
10. Corbin Bosch
11. Raj Angad Bawa
12. Trent Boult
13. Jasprit Bumrah
14. Deepak Chahar
15. Ashwani Kumar
16. Raghu Sharma
17. Allah Ghazanfar
18. Shardul Thakur
19. Sherfane Rutherford
20. Mayank Markande
21. Quinton de Kock
22. Danish Malewar
23. Mohammad Izhar
24. Atharva Ankolekar
25. Mayank Rawat

## 7. Punjab Kings (PBKS)

1.  Shreyas Iyer
2.  Nehal Wadhera
3.  Priyansh Arya
4.  Prabhsimran Singh
5.  Shashank Singh
6.  Pyla Avinash
7.  Harnoor Pannu
8.  Musheer Khan
9.  Vishnu Vinod
10. Marcus Stoinis
11. Azmatullah Omarzai
12. Suryansh Shedge
13. Mitch Owen
14. Arshdeep Singh
15. Vyshak Vijaykumar
16. Marco Jansen
17. Yash Thakur
18. Xavier Bartlett
19. Lockie Ferguson
20. Yuzvendra Chahal
21. Harpreet Brar
22. Ben Dwarshuis
23. Cooper Connolly
24. Pravin Dubey
25. Vishal Nishad

## 8. Rajasthan Royals (RR)

1.  Yashasvi Jaiswal
2.  Vaibhav Suryavanshi
3.  Dhruv Jurel
4.  Riyan Parag
5.  Shimron Hetmyer
6.  Shubham Dubey
7.  Yudhvir Singh Charak
8.  Jofra Archer
9.  Tushar Deshpande
10. Sandeep Sharma
11. Kwena Maphaka
12. Nandre Burger
13. Lhuan-dre Pretorius
14. Ravindra Jadeja
15. Donovan Ferreira
16. Sam Curran
17. Ravi Bishnoi
18. Ravi Singh
19. Sushant Mishra
20. Brijesh Sharma
21. Aman Rao Perala
22. Vignesh Puthur
23. Yash Raj Punja
24. Kuldeep Sen
25. Adam Milne

## 9. Royal Challengers Bengaluru (RCB)

1.  Rajat Patidar
2.  Virat Kohli
3.  Devdutt Padikkal
4.  Phil Salt
5.  Jitesh Sharma
6.  Krunal Pandya
7.  Swapnil Singh
8.  Tim David
9.  Romario Shepherd
10. Jacob Bethell
11. Josh Hazlewood
12. Yash Dayal
13. Bhuvneshwar Kumar
14. Nuwan Thushara
15. Rasikh Salam
16. Abhinandan Singh
17. Suyash Sharma
18. Venkatesh Iyer
19. Jacob Duffy
20. Satvik Deswal
21. Mangesh Yadav
22. Jordan Cox
23. Vicky Ostwal
24. Kanishk Chouhan
25. Vihaan Malhotra

## 10. Sunrisers Hyderabad (SRH)

This list includes T. Natarajan and excludes Zeeshan Ansari following
the confirmed October 2026 trade.

1.  Pat Cummins
2.  Travis Head
3.  Abhishek Sharma
4.  Aniket Verma
5.  Smaran Ravichandran
6.  Ishan Kishan
7.  Heinrich Klaasen
8.  Nitish Kumar Reddy
9.  Harsh Dubey
10. Kamindu Mendis
11. Harshal Patel
12. Brydon Carse
13. Jaydev Unadkat
14. Eshan Malinga
15. Liam Livingstone
16. Jack Edwards
17. Salil Arora
18. Shivam Mavi
19. Krains Fuletra
20. Praful Hinge
21. Amit Kumar
22. Onkar Tarmale
23. Sakib Hussain
24. Shivang Kumar
25. T. Natarajan

------------------------------------------------------------------------

## Validation checklist for the roster update

-   [ ] Exactly ten franchises are present.
-   [ ] Each franchise has 25 listed players in this snapshot.
-   [ ] Every player has a stable unique ID.
-   [ ] Every player is assigned to exactly one franchise.
-   [ ] The four confirmed IPL 2027 trade movements are reflected
    correctly.
-   [ ] There are no duplicate player IDs or duplicate player entries.
-   [ ] The player-pool UI displays the full list grouped by franchise.
-   [ ] Draft availability still marks picked players as unavailable
    across all clients.
-   [ ] The wheel still contains exactly the ten franchises, regardless
    of how many players each franchise has remaining.
-   [ ] The server build and tests pass.

## Sources

Prefer the official IPL / franchise announcements for trade movements.
The full 2026 auction squads are cross-checked against published
post-auction squad lists.

1.  **Official IPL --- 2026 player retentions announcement (15 November
    2025):**\
    https://www.iplt20.com/news/article/tata-ipl-2026-player-retentions-announced
2.  **Official IPL --- Rishabh Pant and Kuldeep Yadav trade between DC
    and LSG (23 June 2026):**\
    https://www.iplt20.com/news/article/rishabh-pant-and-kuldeep-yadav-complete-high-profile-trade-between-dc-and-lsg
3.  **Official IPL --- T. Natarajan and Zeeshan Ansari trade between DC
    and SRH (14 October 2026):**\
    https://www.iplt20.com/news/article/t-natarajan-returns-to-sunrisers-hyderabad-zeeshan-ansari-moves-to-delhi-capitals
4.  **Post-auction squad reference --- MyKhel, IPL 2026 full squads (17
    December 2025):**\
    https://www.mykhel.com/cricket/ipl-2026-squads-full-list-of-players-of-all-ten-teams-after-mini-auction-402162.html
5.  **Post-auction squad reference --- Mint, full IPL 2026 squad
    coverage (updated 9 March 2026):**\
    https://www.livemint.com/sports/cricket-news/ipl-2026-auction-player-list-updated-complete-list-of-players-sold-unsold-for-rcb-csk-kkr-gt-pbks-dc-rr-srh-mi-lsg/amp-11765877782001.html

**Maintenance reminder:** After the IPL 2027 auction and any subsequent
confirmed trades/releases, update this file and the application's local
roster data together. Do not assume this October 2026 snapshot remains
accurate after those events.
