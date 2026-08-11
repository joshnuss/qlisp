(defun inc (num) (+ num 1))
(print (inc 41))

; &rest collects any extra arguments into a list
(defun sum (&rest ns) (apply + ns))
(print (sum 1 2 3 4))

; &rest can follow any number of fixed parameters
(defun labeled-sum (label start &rest ns)
  (list label (+ start (apply + ns))))
(print (labeled-sum "total" 100 1 2 3))
