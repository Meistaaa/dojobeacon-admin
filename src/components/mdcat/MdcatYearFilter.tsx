type MdcatYearFilterProps = {
  years: number[];
  selectedYear: number | "";
  onChange: (year: number | "") => void;
  disabled?: boolean;
};

export default function MdcatYearFilter({
  years,
  selectedYear,
  onChange,
  disabled,
}: MdcatYearFilterProps) {
  return (
    <select
      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
      value={selectedYear === "" ? "" : String(selectedYear)}
      onChange={(e) => {
        const value = e.target.value;
        onChange(value === "" ? "" : Number(value));
      }}
      disabled={disabled}
    >
      <option value="">All years</option>
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
