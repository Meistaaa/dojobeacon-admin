import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { TestSummary } from "../../types/tests";

type MdcatTestCardProps = {
  test: TestSummary;
  onView: (testId: string) => void;
  viewing: boolean;
};

export default function MdcatTestCard({ test, onView, viewing }: MdcatTestCardProps) {
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
            <span className="text-muted-foreground">Duration:</span> {test.duration} mins
          </p>
          <p>
            <span className="text-muted-foreground">Total marks:</span> {test.totalMarks ?? "-"}
          </p>
        </div>
        <div>
          <Button onClick={() => onView(test._id)} disabled={viewing}>
            {viewing ? "Loading..." : "View Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
