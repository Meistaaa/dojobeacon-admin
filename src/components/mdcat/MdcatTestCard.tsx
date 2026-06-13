import { Pencil } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { TestSummary } from "../../types/tests";

type MdcatTestCardProps = {
  test: TestSummary;
  onView: (testId: string) => void;
  viewing: boolean;
  isAdmin?: boolean;
  onManage?: (testId: string) => void;
};

export default function MdcatTestCard({
  test,
  onView,
  viewing,
  isAdmin,
  onManage,
}: MdcatTestCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{test.title}</CardTitle>
          {test.year && (
            <Badge className="text-sm px-3 py-1" variant="default">
              {test.year}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {test.description ? (
          <p className="text-sm text-muted-foreground">{test.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-4 text-sm">
          <p>
            <span className="text-muted-foreground">Duration:</span>{" "}
            {test.duration} mins
          </p>
          <p>
            <span className="text-muted-foreground">Total marks:</span>{" "}
            {test.totalMarks ?? "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onView(test._id)} disabled={viewing}>
            {viewing ? "Loading..." : "View Test"}
          </Button>
          {isAdmin && onManage ? (
            <Button variant="outline" onClick={() => onManage(test._id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Manage Questions
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
