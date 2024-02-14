<?php

require_once "../utils.php";

class SimpleURLParser {
    private $position = 0;
    private $input = '';

    public function parse($url) {
        $this->input = $url;
        $this->position = 0;

        return $this->parseURL();
    }

    private function parseURL() {
        return [
            'scheme' => $this->parseScheme(),
            'host' => $this->parseHost(),
            'path' => $this->parsePath(),
            'query' => $this->parseQuery(),
            'fragment' => $this->parseFragment(),
        ];
    }

    private function parseScheme() {
        $schemeEndPos = strpos($this->input, "://");
        if ($schemeEndPos !== false) {
            $scheme = substr($this->input, 0, $schemeEndPos);
            $this->position = $schemeEndPos + 3; // Move past the "://"
            return $scheme;
        }
        return null; // No scheme found
    }

    private function parseHost() {
        $start = $this->position;
        $hostEndPos = $this->findPositionOf(["/", "?", "#"]);
        if ($hostEndPos !== null) {
            $this->position = $hostEndPos;
        } else {
            $this->position = strlen($this->input); // Move to the end if no further components
        }
        return substr($this->input, $start, $this->position - $start);
    }

    private function parsePath() {
        if ($this->peek() == '/') {
            $this->position++; // Skip over the "/"
            $pathEndPos = $this->findPositionOf(["?", "#"]);
            if ($pathEndPos !== null) {
                $start = $this->position;
                $this->position = $pathEndPos;
                return substr($this->input, $start, $pathEndPos - $start);
            } else {
                // If there's no query or fragment, consume the rest as path
                $rest = substr($this->input, $this->position);
                $this->position = strlen($this->input);
                return $rest;
            }
        }
        return null;
    }

    private function parseQuery() {
        if ($this->peek() == '?') {
            $this->position++; // Skip over the "?"
            $queryEndPos = strpos($this->input, "#", $this->position);
            if ($queryEndPos !== false) {
                $start = $this->position;
                $this->position = $queryEndPos;
                return substr($this->input, $start, $queryEndPos - $start);
            } else {
                // Consume the rest as query
                $rest = substr($this->input, $this->position);
                $this->position = strlen($this->input);
                return $rest;
            }
        }
        return null;
    }

    private function parseFragment() {
        if ($this->peek() == '#') {
            $this->position++; // Skip over the "#"
            return $this->consumeRemaining();
        }
        return null;
    }

    private function findPositionOf(array $chars) {
        foreach ($chars as $char) {
            $pos = strpos($this->input, $char, $this->position);
            if ($pos !== false) {
                return $pos;
            }
        }
        return null;
    }

    private function consumeRemaining() {
        if ($this->position < strlen($this->input)) {
            $remaining = substr($this->input, $this->position);
            $this->position = strlen($this->input);
            return $remaining;
        }
        return null;
    }

    private function peek() {
        if ($this->position < strlen($this->input)) {
            return $this->input[$this->position];
        }
        return null;
    }
}

// Usage example
$parser = new SimpleURLParser();
$url = 'http://www.example.com/path?query=123#fragment';
$parsedUrl = $parser->parse($url);
pp($parsedUrl);
