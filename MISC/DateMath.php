<?php

include "../utils.php";

class DateMathToken {
    public function __construct(public string $type, public string $value) {}
}

class DateMathParser {
    private array $tokens = [];
    private int $currentTokenIndex = 0;

    private function tokenize(string $expression): void {
        $length = strlen($expression);
        $number = '';
        for ($i = 0; $i < $length; $i++) {
            $char = $expression[$i];

            if (is_numeric($char) || ($char === '+' || $char === '-') && isset($expression[$i + 1]) && is_numeric($expression[$i + 1])) {
                $number .= $char;
            } else {
                if ($number !== '') {
                    $this->tokens[] = new DateMathToken('NUMBER', $number);
                    $number = '';
                }
                if (in_array($char, ['Y', 'M', 'W', 'D', 'H', 'm', 's']) || $char === '/') {
                    $this->tokens[] = new DateMathToken('UNIT', $char);
                }
            }
        }

        if ($number !== '') {
            $this->tokens[] = new DateMathToken('NUMBER', $number);
        }
    }

    private function getNextToken(): ?DateMathToken {
        if ($this->currentTokenIndex < count($this->tokens)) {
            return $this->tokens[$this->currentTokenIndex++];
        }
        return null;
    }

    public function parse(string $expression): DateTime {
        $this->tokenize($expression);
        $date = new DateTime('now');
        $resetType = '';

        while ($this->currentTokenIndex < count($this->tokens)) {
            $token = $this->getNextToken();

            if ($token->type === 'NUMBER') {
                $value = intval($token->value);
                $isNegative = $value < 0;
                $value = abs($value);

                $unitToken = $this->getNextToken();
                if ($unitToken && $unitToken->type === 'UNIT' && $unitToken->value !== '/') {
                    $intervalSpec = $this->getIntervalSpec($value, $unitToken->value);
                    if (!empty($intervalSpec)) {
                        $interval = new DateInterval($intervalSpec);
                        $date = $isNegative ? $date->sub($interval) : $date->add($interval);
                    }
                }
            } elseif ($token->type === 'UNIT' && $token->value === '/') {
                // Prepare to reset based on the next token
                $resetType = $this->getNextToken()->value ?? '';
            }

            // Apply reset logic at the end to ensure it's the final operation
            if ($resetType) {
                $date = $this->applyReset($date, $resetType);
                $resetType = ''; // Clear reset type after applying
            }
        }

        return $date;
    }

    private function getIntervalSpec(int $value, string $unit): string {
        return match($unit) {
            'Y' => "P{$value}Y",
            'M' => "P{$value}M",
            'W' => "P{$value}W",
            'D' => "P{$value}D",
            'H' => "PT{$value}H",
            'm' => "PT{$value}M",
            's' => "PT{$value}S",
            default => '',
        };
    }

    private function applyReset(DateTime $date, string $resetType): DateTime {
        return match($resetType) {
            'Y' => (clone $date)->setDate($date->format('Y'), 1, 1)->setTime(0, 0, 0),
            'M' => (clone $date)->setDate($date->format('Y'), $date->format('m'), 1)->setTime(0, 0, 0),
            'W' => (clone $date)->modify('monday this week')->setTime(0, 0, 0),
            'D' => (clone $date)->setTime(0, 0, 0),
            'H' => (clone $date)->setTime($date->format('H'), 0, 0),
            'm' => (clone $date)->setTime($date->format('H'), $date->format('i'), 0),
            's' => (clone $date)->setTime($date->format('H'), $date->format('i'), $date->format('s')),
            default => $date,
        };
    }
}

pp((new DateMathParser())->parse('now/m')->format('Y-m-d H:i:s'));
