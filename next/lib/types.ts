export type Hormone = {
  _id: string;
  name: string;
  unit: string;
  normalRange: string;
  createdAt: string;
};

export type LabResult = {
  _id: string;
  hormoneId: string;
  date: string;
  value: number | null;
  notes: string | null;
  imageUrls: string[];
  createdAt: string;
};
