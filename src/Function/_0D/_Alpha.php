<?php

namespace Function\_0D;


class _Alpha {

    ################################ DETECT MATCHES ###########################################

    /**
     * Detect the presence of a pattern match in a string.
     * @functionType Detect Matches
     */
    public static function detect(
        \Type\_0D\_Alpha|string $string,
        string $pattern
    ) : bool
    {
        return preg_match("/$pattern/", $string);
    }

    /**
     * DETECT MATCHES
     * Detect if a string starts with a specified pattern.
     * @functionType Detect Matches
     */
    public static function starts(
        string $string,
        string $pattern
    ) : bool
    {
        return preg_match("/^$pattern/", $string);
    }

    // str_which: Find the indexes of strings that contain a pattern match.

    /**
     * Locate the positions of pattern matches in a string.
     * @functionType Detect Matches
     */
    public static function locate(
        string $string,
        string $pattern
    ) : array|null
    {
        if (preg_match("/$pattern/", $string, $matches, PREG_OFFSET_CAPTURE)) {
            return [$matches[0][1], $matches[0][1] + strlen($matches[0][0]) - 1];
        }
        return null;
    }

    /**
     * Count the number of pattern matches in a string.
     * @functionType Detect Matches
     */
    public static function count(
        string $string,
        string $pattern
    ) : int
    {
        preg_match_all("/$pattern/", $string, $matches);
        return sizeof((array) $matches);
    }


    ################################# Subset Strings #######################################


    /**
     * Extract substrings from a character vector.
     * @functionType Subset Strings
     */
    public static function sub(
        string $string,
        int $start = 1,
        int $end = -1
    ): string
    {
        $length = $end >= 0 ? $end - $start + 1 : $end;
        return mb_substr($string, $start - 1, $length);
    }

    /**
     * Return the first pattern match found in each string, as a vector.
     * @functionType Subset Strings
     */
    public static function extract(
        string $string,
        string $pattern
    ): ?string {
        if (preg_match("/$pattern/", $string, $matches)) {
            return $matches[0];
        }
        return null;
    }

    /**
     * Return the first pattern match found in each string, as a matrix with a column for each ( ) group in pattern.
     * @functionType Subset Strings
     */
    public static function match(
        string $string,
        string $pattern
    ): ?array {
        if (preg_match("/$pattern/", $string, $matches)) {
            array_shift($matches); // Remove the full match and keep only the groups
            return $matches;
        }
        return null;
    }

    ################################# MANAGE LENGTHS #######################################


    /**
     * The width of strings (i.e. number of code points, which generally equals the number of characters).
     * @functionType Manage Lengths
     */
    public static function length(string $string): int {
        return mb_strlen($string);
    }

    /**
     * Pad strings to constant width.
     * @functionType Manage Lengths
     */
    public static function pad(
        string $string,
        int $width,
        string $side = 'right',
        string $pad = ' '
    ): string {
        $padLength = max(0, $width - mb_strlen($string));

        switch ($side) {
            case 'left':
                return str_repeat($pad, $padLength) . $string;
            case 'both':
                $leftPadding = intdiv($padLength, 2);
                $rightPadding = $padLength - $leftPadding;
                return str_repeat($pad, $leftPadding) . $string . str_repeat($pad, $rightPadding);
            case 'right':
            default:
                return $string . str_repeat($pad, $padLength);
        }
    }

    /**
     * Truncate the width of strings, replacing content with ellipsis.
     * @functionType Manage Lengths
     */
    public static function trunc(
        string $string,
        int $width,
        string $side = 'right',
        string $ellipsis = '...'
    ): string {
        if (mb_strlen($string) <= $width) {
            return $string;
        }

        switch ($side) {
            case 'left':
                return $ellipsis . mb_substr($string, -($width - mb_strlen($ellipsis)));
            case 'center':
                $left = intdiv($width, 2) - intdiv(mb_strlen($ellipsis), 2);
                $right = $width - $left - mb_strlen($ellipsis);
                return mb_substr($string, 0, $left) . $ellipsis . mb_substr($string, -$right);
            case 'right':
            default:
                return mb_substr($string, 0, $width - mb_strlen($ellipsis)) . $ellipsis;
        }
    }

    /**
     * Trim whitespace or characters from both ends of string
     * @functionType Manage Lengths
     */
    public static function trim(
        string $string,
        string $characters = " "
    ) : string
    {
        return trim($string, $characters);
    }
    /**
     * Trim whitespace or characters from left side of string
     * @functionType Manage Lengths
     */
    public static function l_trim(
        string $string,
        string $characters = " "
    ) : string
    {
        return ltrim($string, $characters);
    }

    /**
     * Trim whitespace or characters from right side of string
     * @functionType Manage Lengths
     */
    public static function r_trim(
        string $string,
        string $characters = " "
    ) : string
    {
        return rtrim($string, $characters);
    }


    /**
     * Trim whitespace from each end and collapse multiple spaces into single spaces.
     * @functionType Manage Lengths
     */
    public static function squish(
        string $string
    ): string
    {
        return preg_replace('/\s+/', ' ', trim($string));
    }


    ################################ MUTATE ###########################################


    /**
     * Replace substrings by identifying the substrings with sub and assigning into the results.
     * @functionType Mutate
     */
    public static function sub_replace(
        string &$string,
        int $start,
        int $end,
        string $replacement
    ): void {
        $length = $end >= 0 ? $end - $start + 1 : $end;
        $string = mb_substr($string, 0, $start - 1) . $replacement . mb_substr($string, $start - 1 + $length);
    }

    /**
     * Replace the first matched pattern in each string.
     * @functionType Mutate
     */
    public static function replace(
        string $string,
        string $pattern,
        string $replacement
    ): string {
        return preg_replace("/$pattern/", $replacement, $string, 1);
    }

    /**
     * Replace all matched patterns in each string.
     * @functionType Mutate
     */
    public static function replace_all(
        string $string,
        string $pattern,
        string $replacement
    ): string {
        return preg_replace("/$pattern/", $replacement, $string);
    }

    /**
     * Convert strings to lower case.
     * @functionType Mutate
     */
    public static function to_lower(
        string $string,
        string $locale = "en"
    ): string {
        return mb_strtolower($string, $locale);
    }

    /**
     * Convert strings to upper case.
     * @functionType Mutate
     */
    public static function to_upper(
        string $string,
        string $locale = "en"
    ): string {
        return mb_strtoupper($string, $locale);
    }

    /**
     * Convert strings to title case.
     * @functionType Mutate
     */
    public static function to_title(
        string $string,
        string $locale = "en"
    ): string {
        return mb_convert_case($string, MB_CASE_TITLE, $locale);
    }


    ################################ Join And Split ###########################################

    /**
     * Join multiple strings into a single string.
     * @functionType Join and Split
     */
    public static function c(array $strings, string $sep = "", ?string $collapse = null): string {
        $joined = implode($sep, $strings);
        return $collapse !== null ? implode($collapse, array_fill(0, count($strings), $joined)) : $joined;
    }

    /**
     * Combines into a single string, separated by collapse.
     * @functionType Join and Split
     */
    public static function flatten(array $strings, string $collapse = ""): string {
        return implode($collapse, $strings);
    }

    /**
     * Repeat strings times times.
     * @functionType Join and Split
     */
    public static function dup(string $string, int $times): string {
        return str_repeat($string, $times);
    }

    /**
     * Split a string into a matrix of substrings.
     * @functionType Join and Split
     */
    public static function split_fixed(string $string, string $pattern, int $n): array {
        $splits = preg_split("/$pattern/", $string, -1, PREG_SPLIT_NO_EMPTY);
        $result = array_chunk($splits, $n);
        // Fill the last array if it's not complete
        $lastIndex = count($result) - 1;
        if (count($result[$lastIndex]) < $n) {
            $result[$lastIndex] = array_pad($result[$lastIndex], $n, '');
        }
        return $result;
    }

    /**
     * Create a string from strings and expressions to evaluate.
     * Note: PHP doesn't support inline expression evaluation in strings like R.
     * @functionType Join and Split
     */
    public static function glue(array $strings, string $sep = ""): string {
        // Implementation would depend on how you plan to handle expressions.
        return implode($sep, $strings);
    }

    /**
     * Use a data frame, list, or environment to create a string from strings and expressions to evaluate.
     * Note: PHP doesn't support inline expression evaluation in strings like R.
     * @functionType Join and Split
     */
    public static function glue_data(array $data, array $strings, string $sep = "", string $na = "NA"): string {
        // Implementation would depend on how you plan to handle expressions and data binding.
        return implode($sep, $strings);
    }



    ################################ MISC ###########################################

    public static function n_gram(
        string $text,
               $n = 2
    ) : array
    {
        $words = explode(' ', $text);
        $ngrams = [];

        for ($i = 0; $i < count($words) - $n + 1; $i++) {
            $ngram = implode(' ', array_slice($words, $i, $n));
            $ngrams[] = $ngram;
        }
        return $ngrams;
    }


}
