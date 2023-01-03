import fs from "fs";
import { parse } from "csv-parse/sync";
import _ from "lodash";

const FIELD_TO_NUMBER = [
  "2011 Total per hr",
  "2012 Total per hr",
  "2013 Total per hr",
  "2014 Total per hr",
  "2015 Total per hr",
  "2016 Total per hr",
  "vols_needed",
];

const FIELDS_TO_REMOVE = [
  "geocoded_by",
  "automatic_geocoding_failed",
  "2015_include",
  "column_number_14",
  "last_year_done",
];

const FIELDS_TO_RENAME = [
  ["2015_notes", "notes_2015"],
  ["counter_notes", "notes_counter"],
  ["2011", "year_counted_2011"],
  ["2012", "year_counted_2012"],
  ["2013", "year_counted_2013"],
  ["2014", "year_counted_2014"],
  ["2015", "year_counted_2015"],
  ["2016", "year_counted_2016"],
  ["2011_total_per_hr", "total_per_hr_2011"],
  ["2012_total_per_hr", "total_per_hr_2012"],
  ["2013_total_per_hr", "total_per_hr_2013"],
  ["2014_total_per_hr", "total_per_hr_2014"],
  ["2015_total_per_hr", "total_per_hr_2015"],
  ["2016_total_per_hr", "total_per_hr_2016"],
  ["latitude", "location_latitude"],
  ["longitude", "location_longitude"],
  ["location_n_s", "location_road_n_s"],
  ["location_w_e", "location_road_w_e"],
];

function cleanup_file() {
  const data = fs.readFileSync('./count_sites.csv', 'utf-8');

  const records = parse(data, {
    columns: true,
  });

  const final = records.map((record: any) => {
    const entries = Object.entries(record)
      .map(([key, value]) => {
        // Convert fields to numbers, default to 0
        if (FIELD_TO_NUMBER.includes(key)) value = Number(value) || 0;

        // Convert priority to number, default to 100 (low priority)
        if (key === "priority") value = Number(value) || 100;

        // Convert TRUE/FALSE to boolean value
        if (value === "TRUE") value = true;
        if (value === "FALSE") value = false;

        // Create standard field slug
        let slug = key.replace(/ /g, "_").toLowerCase();

        // Rename fields based on slug
        const renamedField = FIELDS_TO_RENAME.find(([oldName, newName]) => oldName === slug);
        if (renamedField) slug = renamedField[1];

        // Remove fields
        if (FIELDS_TO_REMOVE.includes(slug)) return [];

        return [slug, value];
      })
      // Filter out removed fields (those that have no key)
      .filter(([key]) => !!key);

    const converted = Object.fromEntries(entries);

    // Calculate the mean total rider per hour over all years (not including 0 values)
    const total_per_hour_all = _.mean(
      _.values(_.pickBy(converted, (value, key) => value !== 0 && key.startsWith('total_per')))
    ) || 0;

    // Add new fields
    entries.push(['location_name', `${converted.location_road_n_s} & ${converted.location_road_w_e}`]);
    entries.push(['total_per_hr_all', total_per_hour_all]);

    // Combine original and new fields, sort by key
    return Object.fromEntries(_.sortBy(entries, ([key]) => key));
  });
  console.log(final);

  fs.writeFileSync('./count_sites.json', JSON.stringify(final));
}

cleanup_file();
