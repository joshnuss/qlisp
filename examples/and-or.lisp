; and: returns the last value if all are truthy
(write (and 1 2 3))

; and: short-circuits and returns the first falsy value
(write (and 1 nil 3))

; or: short-circuits and returns the first truthy value
(write (or nil 2 3))

; or: returns nil if everything is falsy
(write (or nil (list)))

; combining and/or to guard a division
(defun safe-div (a b)
  (or (and (not (= b 0)) (/ a b))
      "cannot divide by zero"))

(write (safe-div 10 2))
(write (safe-div 10 0))
