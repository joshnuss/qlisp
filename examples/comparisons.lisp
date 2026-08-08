; =
(write (if (= 1 2) kaboom "pass"))
(write (if (= 1 1) "pass"))

; >
(write (if (> 1 2) kaboom "pass"))
(write (if (> 2 1) "pass"))

; >=
(write (if (>= 1 2) kaboom "pass"))
(write (if (>= 2 1) "pass"))
(write (if (>= 1 1) "pass"))

; <
(write (if (< 2 1) kaboom "pass"))
(write (if (< 1 2) "pass"))

; <=
(write (if (<= 2 1) kaboom "pass"))
(write (if (<= 1 2) "pass"))
(write (if (<= 1 1) "pass"))

; not
(write (if (not t) kaboom "pass"))
(write (if (not nil) "pass"))

