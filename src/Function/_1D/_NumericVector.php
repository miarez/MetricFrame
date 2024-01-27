<?php

namespace Function\_1D;

class _NumericVector extends _Vector {

    public static function min_max_scaler(
        array $data
    ) : array
    {
        $min = min($data);
        $max = max($data);
        return array_map(function($value) use ($min, $max) {
            return ($value - $min) / ($max - $min);
        }, $data);
    }

    public static function normalize(
        array $vector,
              $p = 2
    ) : array
    {
        $norm = 0;
        foreach ($vector as $value) {
            $norm += pow(abs($value), $p);
        }
        $norm = pow($norm, 1 / $p);

        if ($norm == 0) {
            return array_fill(0, count($vector), 0);
        }

        return array_map(function ($value) use ($norm) {
            return $value / $norm;
        }, $vector);
    }


}