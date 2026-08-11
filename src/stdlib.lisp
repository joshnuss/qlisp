; qlisp standard library.
; Loaded into every global environment by createGlobalEnv() in env.ts.
; Definitions that don't need native support (unlike +, car, apply, ...)
; belong here, written in qlisp itself.

(defun 1+ (n) (+ n 1))
(defun 1- (n) (- n 1))

(defun not (x) (if x nil t))

; t if x is false or the empty list, matching this language's truthiness
; rules. Unlike empty?, this never throws: any value can be checked.
(defun null? (x) (not x))

; t if x is a list or string with zero length. Unlike null?, a non-empty
; string is not null? but an empty string IS empty?.
(defun empty? (x) (= (length x) 0))

(defun last (lst)
  (if (cdr lst)
      (last (cdr lst))
      (car lst)))

(defun map (f lst)
  (if lst
      (cons (apply f (list (car lst))) (map f (cdr lst)))
      (list)))

(defun filter (pred lst)
  (cond
    ((not lst) (list))
    ((apply pred (list (car lst))) (cons (car lst) (filter pred (cdr lst))))
    (t (filter pred (cdr lst)))))

(defun reduce (f lst init)
  (if lst
      (reduce f (cdr lst) (apply f (list init (car lst))))
      init))

(defun append (a b)
  (if a
      (cons (car a) (append (cdr a) b))
      b))

(defun reverse (lst)
  (if lst
      (append (reverse (cdr lst)) (list (car lst)))
      (list)))

(defun nth (n lst)
  (if (= n 0)
      (car lst)
      (nth (1- n) (cdr lst))))

(defun second (lst) (nth 1 lst))
(defun third (lst) (nth 2 lst))
