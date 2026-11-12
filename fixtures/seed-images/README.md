# Seed fixture images

Committed **JPEG** assets for local dev and CI seeding. Referenced via `mv-fixture://` URLs (see `fixture-image.ts`).

## Art direction

1980s Japanese **sports anime** cel look (e.g. _Attack No. 1_ / Mila Superstar, _Kickers_): bold outlines, flat shading, bright colours, kid-friendly.

## Layout

| Folder       | Files                                        | Used for                                                                                                                   |
| ------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `clubs/`     | `club-markgraefler-volleys.jpg`, `opp-*.jpg` | SAMS club / ranking logos                                                                                                  |
| `portraits/` | `jersey-1.jpg` … `jersey-8.jpg`              | SAMS roster portraits (each jersey is a distinct cast member: mixed gender, hair, body type)                               |
| `members/`   | `avatar-1.jpg` … `avatar-4.jpg`              | `db:seed` trainers — `1` Max Müller (male), `2` Sarah (long hair), `3` Julia (youth, curls), `4` Anna-Maria (bob, glasses) |
| `teams/`     | `team-photo-1.jpg`, `team-photo-2.jpg`       | `db:seed` team pictures                                                                                                    |
| `sponsors/`  | `sponsor-1.jpg` … `sponsor-4.jpg`            | `db:seed` sponsor logos                                                                                                    |

## Regenerating

Assets are checked into git so CI does not call an image API. When regenerating, **do not use one portrait as the reference for another** — that tends to clone the same face with recolored clothes. Describe each character separately (age, gender, hair, face shape). Then run `vp test fixtures/seed-images/fixture-image.test.ts`.
