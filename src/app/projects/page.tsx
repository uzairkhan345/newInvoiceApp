import Link from "next/link";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectTable } from "@/components/project/ProjectTable";
import {
  ProjectStatusFilter,
  type ProjectStatusFilterValue,
} from "@/components/project/ProjectStatusFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { projectService } from "@/services/projectService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";

/** M27 v2 redesign — unrecognized/missing `?status=` falls back to "all". */
function resolveFilter(status: string | undefined): ProjectStatusFilterValue {
  if (status === "active" || status === "archived") return status;
  return "all";
}

const EMPTY_STATE_COPY: Record<
  ProjectStatusFilterValue,
  { title: string; description: string }
> = {
  all: {
    title: "No projects yet",
    description:
      "Create your first project to link a contractor and a client so invoices can be generated under it.",
  },
  active: {
    title: "No active projects",
    description: "Projects appear here while they're active.",
  },
  archived: {
    title: "No archived projects",
    description: "Projects appear here once they've been archived.",
  },
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string }>;
}) {
  const { status, from } = await searchParams;
  const filter = resolveFilter(status);
  const cameFromDashboard = from === "dashboard";

  const [projects, firedAlertSchedules] = await Promise.all([
    projectService.list(
      filter === "all"
        ? undefined
        : { status: filter === "active" ? "ACTIVE" : "ARCHIVED" },
    ),
    projectAlertScheduleService.listFiredAcrossActiveProjects(),
  ]);
  const firedProjectIds = firedAlertSchedules.map(
    (schedule) => schedule.project.id,
  );

  const emptyCopy = EMPTY_STATE_COPY[filter];

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="The bridge between a contractor and a client, and the home for per-engagement invoice settings."
        backHref={cameFromDashboard ? "/" : undefined}
        backLabel="Back to Dashboard"
        action={
          <Button nativeButton={false} render={<Link href="/projects/new" />}>
            Create Project
          </Button>
        }
      />
      <ProjectStatusFilter active={filter} fromDashboard={cameFromDashboard} />
      {projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={emptyCopy.title}
          description={emptyCopy.description}
          action={
            filter === "all" ? (
              <Button
                nativeButton={false}
                render={<Link href="/projects/new" />}
              >
                Create your first project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProjectTable projects={projects} firedProjectIds={firedProjectIds} />
      )}
    </>
  );
}
