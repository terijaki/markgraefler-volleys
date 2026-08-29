/**
 * ICS calendar API route — /ics/$teamSlug
 *
 * TanStack Start server route (`createFileRoute` + `server.handlers`). API routes
 * do not use a `.server.ts` suffix; load data via createServerFn wrappers instead.
 *
 * Returns an iCalendar (.ics) file from synced SAMS schedule projections.
 * teamSlug can be "all" or a specific team slug (e.g. "herren1").
 * The .ics file extension is stripped automatically.
 */

import { Club } from "@project.config";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { generateIcsCalendar, type IcsCalendar, type IcsEvent } from "ts-ics";
import type { LeagueMatch } from "@/lambda/sams/types";
import { loadScheduleMatchesForSamsTeamUuidsFn } from "@webapp/server/functions/sams";
import { getTeamBySlugFn, listTeamsFn } from "@webapp/server/functions/teams";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

function convertMatchToIcs(
  match: LeagueMatch,
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

  const baseDesc = [
    teamLeagueName,
    homeTeam ? `Heim: ${homeTeam}` : null,
    guestTeam ? `Gast: ${guestTeam}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const results = match.results;
  const score = results?.setPoints;
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
            const { items: allTeams } = await listTeamsFn();
            teamSamsUuids = allTeams.map((t) => t.sbvvTeamId).filter((id): id is string => !!id);
          } else {
            const foundTeam = await getTeamBySlugFn({ data: { slug: teamSlug } });
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
          const matches = await loadScheduleMatchesForSamsTeamUuidsFn({
            data: { teamUuids: teamSamsUuids },
          });
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
