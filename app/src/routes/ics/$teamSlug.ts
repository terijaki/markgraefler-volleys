/**
 * ICS calendar API route — /ics/$teamSlug
 *
 * Returns an iCalendar (.ics) file for SAMS match data.
 * teamSlug can be "all" or a specific team slug (e.g. "herren1").
 * The .ics file extension is stripped automatically.
 */

import { getAllLeagueMatches, type LeagueMatchDto } from "@codegen/sams/generated";
import { Club } from "@project.config";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { generateIcsCalendar, type IcsCalendar, type IcsEvent } from "ts-ics";
import { teamsRepository } from "@/lib/db/repositories";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

async function fetchMatchesForTeam(teamUuid: string): Promise<LeagueMatchDto[]> {
  const allMatches: LeagueMatchDto[] = [];
  let currentPage = 0;
  let hasMorePages = true;

  while (hasMorePages) {
    const { data } = await getAllLeagueMatches({
      query: {
        "for-team": teamUuid,
        page: currentPage,
        size: 100,
      },
    });

    if (!data) break;
    if (data.content) {
      allMatches.push(...data.content);
      currentPage++;
    }
    if (data.last === true) hasMorePages = false;
  }

  return allMatches;
}

async function fetchAllLeagueMatches(teamUuids: string[]): Promise<LeagueMatchDto[]> {
  const perTeam = await Promise.all(teamUuids.map((uuid) => fetchMatchesForTeam(uuid)));
  const seen = new Set<string>();
  const deduped: LeagueMatchDto[] = [];
  for (const matches of perTeam) {
    for (const match of matches) {
      if (match.uuid && !seen.has(match.uuid)) {
        seen.add(match.uuid);
        deduped.push(match);
      }
    }
  }
  return deduped;
}

function convertMatchToIcs(
  match: LeagueMatchDto,
  teamLeagueName: string | undefined,
  timestamp: Date,
): IcsEvent | null {
  if (!match.date || !match.time) return null;
  const startTime = dayjs
    .tz(`${match.date} ${match.time}`, "YYYY-MM-DD HH:mm", "Europe/Berlin")
    .utc();
  if (!startTime.isValid()) return null;

  const team1 = match._embedded?.team1;
  const team2 = match._embedded?.team2;
  const homeTeam = [team1, team2].find((t) => t?.uuid === match.host)?.name;
  const guestTeam = [team1, team2].find((t) => t?.uuid !== match.host)?.name;

  const locationParts: string[] = [];
  if (match.location?.name) locationParts.push(match.location.name);
  if (match.location?.address?.street) locationParts.push(match.location.address.street);
  const postalCity = [match.location?.address?.postcode, match.location?.address?.city]
    .filter(Boolean)
    .join(" ");
  if (postalCity) locationParts.push(postalCity);

  const baseDesc = [
    teamLeagueName,
    homeTeam ? `Heim: ${homeTeam}` : null,
    guestTeam ? `Gast: ${guestTeam}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const score = match.results?.setPoints;
  const description = score ? `Ergebnis: ${score}, ${baseDesc}` : baseDesc;

  return {
    start: { date: startTime.toDate(), type: "DATE-TIME" },
    duration: { hours: 3 },
    stamp: { date: timestamp, type: "DATE-TIME" },
    uid: match.uuid,
    summary: `${team1?.name} vs ${team2?.name}`,
    description,
    location: locationParts.join(", "),
  };
}

export const Route = createFileRoute("/ics/$teamSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const teamSlug = (params.teamSlug || "all").replace(/\.ics$/i, "").toLowerCase();

          let teamSamsUuids: string[] = [];
          let teamLeagueName: string | undefined;
          let calendarTitle: string = Club.shortName;

          if (!teamSlug || teamSlug === "all") {
            calendarTitle = `${calendarTitle} - Vereinskalender`;
            const { items: allTeams } = await teamsRepository.listAll();
            teamSamsUuids = allTeams.map((t) => t.sbvvTeamId).filter((id): id is string => !!id);
          } else {
            const foundTeam = await teamsRepository.getBySlug(teamSlug);
            if (!foundTeam) {
              return new Response("Team nicht gefunden", {
                status: 404,
                headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" },
              });
            }
            if (foundTeam.name) calendarTitle = `${calendarTitle} - ${foundTeam.name}`;
            if (foundTeam.league) teamLeagueName = foundTeam.league;
            if (foundTeam.sbvvTeamId) teamSamsUuids = [foundTeam.sbvvTeamId];
          }

          const timestamp = new Date();
          const matches = await fetchAllLeagueMatches(teamSamsUuids);
          const matchEvents = matches
            .map((match) => convertMatchToIcs(match, teamLeagueName, timestamp))
            .filter((e): e is IcsEvent => e !== null);

          const icsCalendar: IcsCalendar = {
            prodId: Club.shortName,
            version: "2.0",
            events: matchEvents,
            name: calendarTitle,
          };

          return new Response(generateIcsCalendar(icsCalendar), {
            status: 200,
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": `attachment; filename="${teamSlug || "all"}.ics"`,
              "Cache-Control": "public, max-age=1800, s-maxage=1800",
            },
          });
        } catch (error) {
          console.error("Error generating calendar:", error);
          return new Response("Es gab ein Problem beim Erzeugen des Kalenders", {
            status: 500,
            headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" },
          });
        }
      },
    },
  },
});
