import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectTable } from "@/components/project/ProjectTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { projectService } from "@/services/projectService";

export default async function ProjectsPage() {
  const projects = await projectService.list();

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="The bridge between a contractor and a client, and the home for per-engagement invoice settings."
        action={
          <Button nativeButton={false} render={<Link href="/projects/new" />}>
            Create Project
          </Button>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to link a contractor and a client so invoices can be generated under it."
          action={
            <Button nativeButton={false} render={<Link href="/projects/new" />}>
              Create your first project
            </Button>
          }
        />
      ) : (
        <ProjectTable projects={projects} />
      )}
    </>
  );
}
