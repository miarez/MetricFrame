library(readr)
library(dplyr)
library(lubridate)

input <- paste0(getwd(), "/table/data/data2.csv")
output <- paste0(getwd(), "/table/data/data4.csv")

df <- read_csv(input, show_col_types = FALSE)

df <- df %>%
  mutate(
    date = mdy(date),
    is_weekend = wday(date) %in% c(1, 7)   # Sunday=1, Saturday=7
  ) %>%
  relocate(is_weekend, .after = source)      # move to 3rd column

write_csv(df, output)