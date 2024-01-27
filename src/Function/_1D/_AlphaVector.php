<?php

namespace Function\_1D;

use Function\_0D\_Alpha;

class _AlphaVector extends _Vector {

    public static function which(
        array $strings,
              $pattern,
              $negate = false
    ) : array # array of int ...
    {
        $indexes = [];
        foreach ($strings as $index => $string) {
            if (_Alpha::detect($string, $pattern) !== $negate) {
                $indexes[] = $index;
            }
        }
        return $indexes;
    }

    /**
     * Return only the strings that contain a pattern match.
     */
    public static function subset(
        array $strings,
        string $pattern,
        bool $negate = false
    ): array {
        return array_filter($strings, function($string) use ($pattern, $negate) {
            $match = preg_match("/$pattern/", $string);
            return $negate ? !$match : $match;
        });
    }



    public static function n_gram(
        array $array,
        int $n = 2
    ) : array
    {
        $result = [];
        foreach($array as $item){
            $result[] = _Alpha::n_gram($item);
        }
        return $result;
    }


}